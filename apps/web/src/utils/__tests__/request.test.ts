import { beforeEach, describe, expect, it, vi } from 'vitest';

// 全站会话安全的关键路径：401 单飞刷新（并发共享一次 refresh、成功重放、
// 失败引导重登、auth 路径豁免、__retried 防循环、silent 静默）。锁行为契约，不断言文案。
const elMessageError = vi.hoisted(() => vi.fn());
vi.mock('element-plus', () => ({
  ElMessage: { error: elMessageError, warning: vi.fn(), success: vi.fn() },
}));
vi.mock('@/locales', () => ({ i18n: { global: { t: (key: string) => key } } }));

// 可编程假 adapter：按队列顺序吐响应。axios 的 settle（status 校验）发生在内置 adapter
// 内部，自定义 adapter 必须自行模拟：非 2xx 以 AxiosError 附带 response 拒绝，
// 与真实服务端行为一致地进入响应拦截器错误分支。
const script = vi.hoisted(() => ({
  queue: [] as Array<{ status: number; data: unknown; network?: boolean }>,
}));
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  const { AxiosError } = actual.default;

  const fakeAdapter = (cfg: Cfg): Promise<Res> => {
    const next = script.queue.shift();
    if (!next) {
      return Promise.reject(new Error('script exhausted'));
    }
    if (next.network) {
      return Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, cfg));
    }
    const response: Res = {
      status: next.status,
      data: next.data as never,
      statusText: '',
      headers: {},
      config: cfg,
    };
    const ok = cfg.validateStatus
      ? cfg.validateStatus(next.status)
      : next.status >= 200 && next.status < 300;
    return ok
      ? Promise.resolve(response)
      : Promise.reject(
          new AxiosError(
            `Request failed with status code ${next.status}`,
            AxiosError.ERR_BAD_RESPONSE,
            cfg,
            undefined,
            response as never,
          ),
        );
  };

  return {
    default: Object.assign(vi.fn(), actual.default, {
      create(config?: import('axios').AxiosRequestConfig) {
        const instance = actual.default.create(config);
        instance.defaults.adapter = fakeAdapter;
        return instance;
      },
    }),
  };
});

type Cfg = import('axios').InternalAxiosRequestConfig;
type Res = import('axios').AxiosResponse;

import { http } from '@/utils/request';
import { bindTokenBus } from '@/utils/token-bus';

const refreshFn = vi.fn(() => Promise.resolve(true));
const expiredFn = vi.fn();

function queue401(count: number): void {
  for (let i = 0; i < count; i += 1) {
    script.queue.push({ status: 401, data: { code: 'AUTH_UNAUTHENTICATED', message: 'expired' } });
  }
}

beforeEach(() => {
  script.queue.length = 0;
  vi.clearAllMocks();
  refreshFn.mockReset().mockResolvedValue(true);
  bindTokenBus({ getToken: () => 'test-token', refresh: refreshFn, onSessionExpired: expiredFn });
});

describe('envelope 解包与业务错误', () => {
  it('成功响应解包为 data；业务错误码抛出并携带 requestId/status', async () => {
    script.queue.push({ status: 200, data: { code: 0, data: { id: 1 } } });
    await expect(http.get('/users/1')).resolves.toEqual({ id: 1 });

    script.queue.push({
      status: 200,
      data: { code: 'USER_NOT_FOUND', message: 'missing', requestId: 'r-2' },
    });
    await expect(http.get('/users/1')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      requestId: 'r-2',
    });
  });

  it('非 envelope 响应原样透传（附件下载等二进制路径不参与解包）', async () => {
    const blob = new Blob(['payload']);
    script.queue.push({ status: 200, data: blob });
    await expect(http.get('/files/1/download', { responseType: 'blob' })).resolves.toBe(blob);
  });

  it('非 envelope 错误响应保留 HTTP 状态码；无响应网络错误回落 HTTP_0', async () => {
    script.queue.push({ status: 500, data: undefined });
    await expect(http.get('/users/1')).rejects.toMatchObject({ code: 'HTTP_500', status: 500 });

    script.queue.push({ status: 0, data: null, network: true });
    const err = (await http.get('/users/1').catch((e: unknown) => e)) as { code: string };
    expect(err.code).toBe('HTTP_0');
  });
});

describe('错误码文案与 HTTP 动词封装', () => {
  it('已知错误码使用本地文案；未收录码回落服务端 message', async () => {
    script.queue.push({
      status: 403,
      data: { code: 'AUTH_FORBIDDEN', message: 'server text', requestId: 'r-3', data: null },
    });
    await expect(http.get('/users/1')).rejects.toMatchObject({ code: 'AUTH_FORBIDDEN' });
    expect(elMessageError).toHaveBeenCalledWith('error.forbidden');

    script.queue.push({
      status: 400,
      data: { code: 'SOMETHING_NEW', message: 'server text', requestId: 'r-4', data: null },
    });
    await expect(http.get('/users/1')).rejects.toMatchObject({
      code: 'SOMETHING_NEW',
      message: 'server text',
    });
  });

  it('put/delete 复用同一解包与错误语义', async () => {
    script.queue.push({ status: 200, data: { code: 0, data: { ok: true } } });
    await expect(http.put('/users/1', { nickname: 'n' })).resolves.toEqual({ ok: true });

    script.queue.push({ status: 200, data: { code: 0, data: null } });
    await expect(http.delete('/users/1')).resolves.toBeNull();
  });
});

describe('401 单飞刷新契约', () => {
  it('并发 401 共享一次 refresh，成功后各自重放', async () => {
    queue401(3);
    script.queue.push(
      { status: 200, data: { code: 0, data: 'a' } },
      { status: 200, data: { code: 0, data: 'b' } },
      { status: 200, data: { code: 0, data: 'c' } },
    );

    const results = await Promise.all([http.get('/users'), http.get('/users'), http.get('/users')]);

    expect(results).toEqual(['a', 'b', 'c']);
    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(expiredFn).not.toHaveBeenCalled();
    expect(elMessageError).not.toHaveBeenCalled();
  });

  it('刷新失败：清理会话引导重登并上交终局码（区分停用/过期文案），不叠加错误提示', async () => {
    queue401(1);
    refreshFn.mockResolvedValue(false);

    await expect(http.get('/users')).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' });

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(expiredFn).toHaveBeenCalledWith('AUTH_UNAUTHENTICATED');
    expect(elMessageError).not.toHaveBeenCalled();
  });

  it('重放后仍 401：不再二次刷新，清理会话并上交终局码', async () => {
    queue401(2);

    await expect(http.get('/users')).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' });

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(expiredFn).toHaveBeenCalledWith('AUTH_UNAUTHENTICATED');
    expect(elMessageError).not.toHaveBeenCalled();
  });
});

describe('401 终局与会话清理', () => {
  it('终局码区分文案依据：过期码原样上交，由会话方归类', async () => {
    script.queue.push({ status: 401, data: { code: 'AUTH_TOKEN_EXPIRED', message: 'expired' } });
    refreshFn.mockResolvedValue(false);

    await expect(http.get('/users')).rejects.toMatchObject({ code: 'AUTH_TOKEN_EXPIRED' });

    expect(expiredFn).toHaveBeenCalledWith('AUTH_TOKEN_EXPIRED');
  });

  it('并发终局 401：每个终局请求各自触发会话清理调用（由会话方防抖收敛）', async () => {
    queue401(3);
    refreshFn.mockResolvedValue(false);

    await expect(
      Promise.allSettled([http.get('/users'), http.get('/users'), http.get('/users')]),
    ).resolves.toHaveLength(3);

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(expiredFn).toHaveBeenCalledTimes(3);
    expect(expiredFn).toHaveBeenCalledWith('AUTH_UNAUTHENTICATED');
    expect(elMessageError).not.toHaveBeenCalled();
  });

  it('auth 路径 401 不触发刷新与会话清理，仅按契约提示', async () => {
    script.queue.push({
      status: 401,
      data: { code: 'AUTH_INVALID_CREDENTIALS', message: 'bad' },
    });

    await expect(http.post('/auth/login', {})).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
    });

    expect(refreshFn).not.toHaveBeenCalled();
    expect(expiredFn).not.toHaveBeenCalled();
    expect(elMessageError).toHaveBeenCalledTimes(1);
  });

  it('silent 模式失败不弹全局提示', async () => {
    queue401(1);
    refreshFn.mockResolvedValue(false);

    await expect(http.get('/users', { silent: true })).rejects.toBeTruthy();
    expect(elMessageError).not.toHaveBeenCalled();
  });
});
