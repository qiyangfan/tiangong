import { beforeEach, describe, expect, it, vi } from 'vitest';

// uni 全局桩：request 按脚本队列吐响应，storage 为内存 map，导航/提示记录调用。
// request.ts 与 auth.ts 仅在函数体内消费 uni.*，模块加载时不触碰全局，桩可后置注入。
const storage = new Map<string, unknown>();
const launches: string[] = [];
const toasts: string[] = [];
const script: Array<{ statusCode: number; body: unknown }> = [];

vi.stubGlobal('uni', {
  request: (opts: {
    success: (res: { statusCode: number; data: unknown }) => void;
    fail: () => void;
  }) => {
    const next = script.shift();
    if (!next) {
      opts.fail();
      return;
    }
    opts.success({ statusCode: next.statusCode, data: next.body });
  },
  getStorageSync: (key: string) => storage.get(key),
  setStorageSync: (key: string, value: unknown) => {
    storage.set(key, value);
  },
  removeStorageSync: (key: string) => {
    storage.delete(key);
  },
  reLaunch: (opts: { url: string }) => {
    launches.push(opts.url);
  },
  showToast: (opts: { title: string }) => {
    toasts.push(opts.title);
  },
});

import { clearSession, getAccessToken, getRefreshToken, storeSession } from '../auth';
import { http, sessionExpiredCategory, type TgError } from '../request';

function loginFixture(): void {
  storeSession('access-1', 'refresh-1', { id: 1, username: 'admin', nickname: 'A' });
}

const expired401 = { statusCode: 401, body: { code: 'AUTH_TOKEN_EXPIRED', message: 'expired' } };
const refreshOk = {
  statusCode: 200,
  body: { code: 0, data: { accessToken: 'access-2', refreshToken: 'refresh-2' } },
};

beforeEach(() => {
  script.length = 0;
  storage.clear();
  launches.length = 0;
  toasts.length = 0;
});

describe('终局 401 会话恢复（与 web 层同语义）', () => {
  it('重放仍 401：清会话回登录，refresh 只发生一次', async () => {
    loginFixture();
    script.push(expired401, refreshOk, expired401);

    await expect(http.get('/samples')).rejects.toMatchObject({ code: 'AUTH_TOKEN_EXPIRED' });

    expect(getAccessToken()).toBe('');
    expect(getRefreshToken()).toBe('');
    expect(launches).toEqual(['/pages/login/index']);
    // 过期码终局：恰好一次提示，归类为引导重登（非停用）
    expect(toasts).toHaveLength(1);
    expect(sessionExpiredCategory({ code: 'AUTH_TOKEN_EXPIRED' } as TgError, true)).toBe('expired');
    expect(script).toHaveLength(0);
  });

  it('被停用（重放后 AUTH_UNAUTHENTICATED 401）：按终局清理并提示停用文案', async () => {
    loginFixture();
    script.push(
      { statusCode: 401, body: { code: 'AUTH_UNAUTHENTICATED', message: 'disabled' } },
      refreshOk,
      { statusCode: 401, body: { code: 'AUTH_UNAUTHENTICATED', message: 'disabled' } },
    );

    await expect(http.get('/samples')).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' });

    expect(getAccessToken()).toBe('');
    expect(launches).toEqual(['/pages/login/index']);
    // 带有效 Bearer 仍被拒 = 账号被停用，提示归类为停用
    expect(toasts).toHaveLength(1);
    expect(sessionExpiredCategory({ code: 'AUTH_UNAUTHENTICATED' } as TgError, true)).toBe('disabled');
  });

  it('无凭据的 401（如系统清理存储后）：终局清理并提示引导重登，不误报账号被停用', async () => {
    script.push({ statusCode: 401, body: { code: 'AUTH_UNAUTHENTICATED', message: 'no token' } });

    await expect(http.get('/samples')).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' });

    expect(script).toHaveLength(0);
    expect(launches).toEqual(['/pages/login/index']);
    // 回归锁：无凭据 ≠ 账号被停用，提示归类为引导重登（不得弹停用类误导用户）
    expect(toasts).toHaveLength(1);
    expect(sessionExpiredCategory({ code: 'AUTH_UNAUTHENTICATED' } as TgError, false)).toBe('expired');
  });

  it('auth 路径 401（登录失败）：不清理不跳转，仅提示', async () => {
    script.push({
      statusCode: 401,
      body: { code: 'AUTH_INVALID_CREDENTIALS', message: 'bad credentials' },
    });

    await expect(http.post('/auth/login', {})).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
    });

    expect(launches).toHaveLength(0);
    expect(toasts).toHaveLength(1);
  });

  it('未收录错误码回落服务端 message', async () => {
    script.push({
      statusCode: 404,
      body: { code: 'USER_NOT_FOUND', message: 'User not found' },
    });

    await expect(http.get('/samples')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });

    expect(toasts).toEqual(['User not found']);
  });

  it('silent 终局 401：仍清理回登录，但不弹提示', async () => {
    loginFixture();
    script.push(expired401, refreshOk, expired401);

    await expect(http.get('/samples', { silent: true })).rejects.toBeTruthy();

    expect(launches).toEqual(['/pages/login/index']);
    expect(toasts).toHaveLength(0);
  });

  it('刷新成功且重放通过：不触发清理（正常恢复路径）', async () => {
    loginFixture();
    script.push(expired401, refreshOk, { statusCode: 200, body: { code: 0, data: 'ok' } });

    await expect(http.get('/samples')).resolves.toBe('ok');

    expect(launches).toHaveLength(0);
    expect(getAccessToken()).toBe('access-2');
  });
});

describe('requestId 透传', () => {
  it('业务错误对象携带服务端 envelope 的 requestId（与 web 层同字段）', async () => {
    loginFixture();
    script.push({
      statusCode: 400,
      body: { code: 'VALIDATION_ERROR', message: 'bad', requestId: 'r-9' },
    });

    await expect(http.get('/samples')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      requestId: 'r-9',
    });
  });
});

describe('会话存取', () => {
  it('clearSession 清空全部凭据', () => {
    loginFixture();
    clearSession();
    expect(getAccessToken()).toBe('');
    expect(getRefreshToken()).toBe('');
  });
});
