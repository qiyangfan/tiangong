import { SUCCESS_CODE, type ApiError, type ApiSuccess } from '@tiangong/contracts';
import { i18n } from '@/locales';
import {
  claimSessionTerminalHandling,
  clearSession,
  getAccessToken,
  getRefreshToken,
  storeAccessToken,
  storeRefreshToken,
} from './auth';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** API 基地址：编译期由 VITE_API_BASE_URL 注入（真机需 https 且配域名白名单）。 */
const API_BASE = String(import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000/api/v1');

const SESSION_EXPIRED_STATUS = 401;

/** 业务错误：携带契约错误码与请求 id，调用方按需分支。 */
export interface TgError extends Error {
  code: string;
  requestId?: string;
  status?: number;
}

/** 错误载荷集中以对象传递，避免长参数表（与 web request 层同形）。 */
interface TgErrorInit {
  code: string;
  message: string;
  requestId?: string;
  status?: number;
}

/** 可选字段仅在调用方给出时写入：exactOptionalPropertyTypes 下显式赋 undefined 不合法。 */
function tgError({ code, message, requestId, status }: TgErrorInit): TgError {
  const err = new Error(message) as TgError;
  err.code = code;
  if (requestId !== undefined) {
    err.requestId = requestId;
  }
  if (status !== undefined) {
    err.status = status;
  }
  return err;
}

interface RequestOptions {
  /** 静默模式：失败不弹 toast（后台刷新等场景）。 */
  silent?: boolean;
}

/** 单次请求参数：method/url 恒有，其余按调用方覆盖。 */
interface RequestInit extends RequestOptions {
  method: HttpMethod;
  url: string;
  data?: unknown;
}

function showError(err: TgError): void {
  // 错误码命中用户文案则本地化（errors 组键 = 契约错误码 ∪ NETWORK_ERROR），未收录码回落服务端 message
  const key = `errors.${err.code}`;
  const localized = i18n.global.te(key) ? i18n.global.t(key) : '';
  void uni.showToast({
    title: localized || err.message || i18n.global.t('common.requestFailed'),
    icon: 'none',
  });
}

function gotoLogin(): void {
  void uni.reLaunch({ url: '/pages/login/index' });
}

/** 响应体是否为契约 envelope（code 为数字或字符串）；非 envelope 一律按异常响应处理。 */
function isEnvelope(body: unknown): body is ApiSuccess<unknown> | ApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    (typeof body.code === 'number' || typeof body.code === 'string')
  );
}

/** 成功 envelope 解包为 data；失败 envelope 抛统一 TgError。 */
function unwrapBody(body: unknown, status: number): unknown {
  if (!isEnvelope(body)) {
    const err = tgError({ code: `HTTP_${status}`, message: 'unexpected response', status });
    throw err;
  }
  // 业务码取值非 0 即错误侧；requestId 透传供用户报障时对齐服务端日志与审计记录（与 web 层同字段）
  if (body.code !== SUCCESS_CODE) {
    const { code, message, requestId } = body;
    throw tgError({ code, message, requestId, status });
  }
  return body.data;
}

function rawRequest<T>({ method, url, data }: RequestInit): Promise<T> {
  const accessToken = getAccessToken();
  return new Promise((resolve, reject) => {
    // 回调式 API 返回 RequestTask 非 Promise；data 收窄到 uni 允许的载荷类型。
    // GET/DELETE 一律不带 data 键（按请求参数拼在 url 或走 method 语义）
    uni.request({
      url: `${API_BASE}${url}`,
      method,
      ...(data === undefined
        ? {}
        : { data: data as string | Record<string, unknown> | ArrayBuffer }),
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      success: (res) => {
        // 解包抛出的 TgError 走 reject 交上层统一处理
        try {
          resolve(unwrapBody(res.data, res.statusCode) as T);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      },
      fail: () => {
        reject(tgError({ code: 'NETWORK_ERROR', message: 'network unavailable' }));
      },
    });
  });
}

// 401 单飞刷新：并发 401 共享一次 refresh，成功后各自重放（与 web request 层同语义）
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  try {
    const data = await rawRequest<{ accessToken: string; refreshToken: string }>({
      method: 'POST',
      url: '/auth/refresh',
      data: { refreshToken, client: 'miniapp' },
    });
    storeAccessToken(data.accessToken);
    // refresh 轮换：新 refresh 一并落存储（rawRequest 不带旧 access 也无妨，refresh 端点只认 body）
    storeRefreshToken(data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/** 并发 401 共享一次刷新，返回刷新是否成功。 */
function shareRefresh(): Promise<boolean> {
  refreshing ??= refreshSession().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * 终局 401 提示分类：带有效 Bearer 仍被拒（重放后）＝账号被停用/删除；
 * 无凭据或刷新失败＝引导重登（凭据可能只是被系统清理，非账号问题）。
 */
export function sessionExpiredCategory(err: TgError, retried: boolean): 'expired' | 'disabled' {
  const disabled =
    err.code === 'AUTH_ACCOUNT_DISABLED' || (err.code === 'AUTH_UNAUTHENTICATED' && retried);
  return disabled ? 'disabled' : 'expired';
}

/** 受保护路径的 HTTP 401 是会话级事件；auth 路径（登录/刷新/登出）的 401 是操作本身的预期结果。 */
function isSessionDead(err: TgError, url: string): boolean {
  return err.status === SESSION_EXPIRED_STATUS && !url.startsWith('/auth/');
}

/**
 * 终局 401（无凭据/被停用/刷新失败/重放仍被拒）：会话不可用。并发/跨页在途请求会各自
 * 到此，同一死亡周期只由首个终局请求执行清理+回登录+提示，其余仅抛出
 * （claim 以写入新凭据为复位点，silent 终局同样消费 claim，与 web 层 store 防抖同语义）；
 * 提示按终局位置区分：带有效 Bearer 仍被拒（重放后）= 账号被停用/删除；
 * 无凭据或刷新失败 = 引导重登（凭据可能只是被系统清理，非账号问题）。
 */
function settleExpired(err: TgError, retried: boolean, silent: boolean): void {
  if (!claimSessionTerminalHandling()) {
    return;
  }
  clearSession();
  gotoLogin();
  if (!silent) {
    void uni.showToast({
      title: i18n.global.t(`session.${sessionExpiredCategory(err, retried)}`),
      icon: 'none',
    });
  }
}

interface SendInit extends RequestInit {
  /** 已因 401 刷新而重放，重放后仍被拒即终局。 */
  retried?: boolean;
}

/** 会话级 401 的处置：未重放过则单飞刷新后重放一次，刷新失败与终局均清理并抛出。 */
async function recoverOrSettle<T>(init: SendInit, err: TgError): Promise<T> {
  if (init.retried || !(await shareRefresh())) {
    settleExpired(err, init.retried === true, init.silent === true);
    throw err;
  }
  return send<T>({ ...init, retried: true });
}

/**
 * 请求编排：会话级 401 先单飞刷新并重放一次，仍失败走终局处理；其余失败统一提示。
 * recoverOrSettle 的重放经本函数，故以函数声明保互引（提升）语义。
 */
async function send<T>(init: SendInit): Promise<T> {
  try {
    return await rawRequest<T>(init);
  } catch (raw) {
    const err = raw as TgError;
    if (isSessionDead(err, init.url)) {
      return recoverOrSettle<T>(init, err);
    }
    if (!init.silent) {
      showError(err);
    }
    throw err;
  }
}

/** 只把调用方显式给出的选项并入请求：exactOptionalPropertyTypes 下不得写 undefined。 */
function withOptions(init: RequestInit, options?: RequestOptions): SendInit {
  return options?.silent === undefined ? init : { ...init, silent: options.silent };
}

export const http = {
  get<T>(url: string, options?: RequestOptions): Promise<T> {
    return send<T>(withOptions({ method: 'GET', url }, options));
  },
  post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return send<T>(withOptions({ method: 'POST', url, data }, options));
  },
  put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return send<T>(withOptions({ method: 'PUT', url, data }, options));
  },
  delete<T = void>(url: string, options?: RequestOptions): Promise<T> {
    return send<T>(withOptions({ method: 'DELETE', url }, options));
  },
};
