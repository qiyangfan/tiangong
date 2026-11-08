import { SUCCESS_CODE, type ApiError } from '@tiangong/contracts';
import { i18n } from '@/locales';
import {
  claimSessionTerminalHandling,
  clearSession,
  getAccessToken,
  getRefreshToken,
  storeAccessToken,
  storeRefreshToken,
} from './auth';

/** API 基地址：编译期由 VITE_API_BASE_URL 注入（真机需 https 且配域名白名单）。 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

/** 业务错误：携带契约错误码与请求 id，调用方按需分支。 */
export interface TgError extends Error {
  code: string;
  requestId?: string;
  status?: number;
}

function tgError(code: string, message: string, requestId?: string, status?: number): TgError {
  const err = new Error(message) as TgError;
  err.code = code;
  err.requestId = requestId;
  err.status = status;
  return err;
}

interface RequestOptions {
  /** 静默模式：失败不弹 toast（后台刷新等场景）。 */
  silent?: boolean;
}

function showError(err: TgError): void {
  // 错误码命中用户文案则本地化（errors 组键 = 契约错误码 ∪ NETWORK_ERROR），未收录码回落服务端 message
  const key = `errors.${err.code}`;
  const localized = i18n.global.te(key) ? i18n.global.t(key) : '';
  uni.showToast({
    title: localized || err.message || i18n.global.t('common.requestFailed'),
    icon: 'none',
  });
}

function gotoLogin(): void {
  uni.reLaunch({ url: '/pages/login/index' });
}

function rawRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${url}`,
      method,
      data: data as Record<string, unknown> | undefined,
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      success: (res) => {
        const body = res.data as { code?: number | string; data?: T; message?: string };
        if (typeof body?.code !== 'number' && typeof body?.code !== 'string') {
          reject(
            tgError(`HTTP_${res.statusCode}`, 'unexpected response', undefined, res.statusCode),
          );
          return;
        }
        if (body.code === SUCCESS_CODE) {
          resolve(body.data as T);
          return;
        }
        const apiError = body as unknown as ApiError;
        // requestId 透传：用户报障时可对齐服务端日志与审计记录（与 web 层同字段）
        reject(tgError(apiError.code, apiError.message, apiError.requestId, res.statusCode));
      },
      fail: () => {
        reject(tgError('NETWORK_ERROR', 'network unavailable'));
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
    const data = await rawRequest<{ accessToken: string; refreshToken: string }>(
      'POST',
      '/auth/refresh',
      { refreshToken, client: 'miniapp' },
    );
    storeAccessToken(data.accessToken);
    // refresh 轮换：新 refresh 一并落存储（rawRequest 不带旧 access 也无妨，refresh 端点只认 body）
    storeRefreshToken(data.refreshToken);
    return true;
  } catch {
    return false;
  }
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

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: unknown,
  options?: RequestOptions,
  retried = false,
): Promise<T> {
  try {
    return await rawRequest<T>(method, url, data);
  } catch (err) {
    const e = err as TgError;
    // 受保护路径的 HTTP 401 是会话级事件（过期/无效/被停用统一按状态码判定，与 web 层同语义）；
    // auth 路径（登录/刷新/登出）的 401 是操作本身的预期结果，不得触发全局会话清理
    const sessionDead = e.status === 401 && !url.startsWith('/auth/');
    if (sessionDead && !retried) {
      refreshing ??= refreshSession().finally(() => {
        refreshing = null;
      });
      if (await refreshing) {
        return request<T>(method, url, data, options, true);
      }
    }
    if (sessionDead) {
      // 终局 401（无凭据/被停用/刷新失败/重放仍被拒）：会话不可用。并发/跨页在途请求会各自
      // 到此，同一死亡周期只由首个终局请求执行清理+回登录+提示，其余仅抛出
      // （claim 以写入新凭据为复位点，silent 终局同样消费 claim，与 web 层 store 防抖同语义）；
      // 提示按终局位置区分：带有效 Bearer 仍被拒（重放后）= 账号被停用/删除；
      // 无凭据或刷新失败 = 引导重登（凭据可能只是被系统清理，非账号问题）
      if (claimSessionTerminalHandling()) {
        clearSession();
        gotoLogin();
        if (!options?.silent) {
          uni.showToast({
            title: i18n.global.t(`session.${sessionExpiredCategory(e, retried)}`),
            icon: 'none',
          });
        }
      }
      throw e;
    }
    if (!options?.silent) {
      showError(e);
    }
    throw e;
  }
}

export const http = {
  get<T>(url: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', url, undefined, options);
  },
  post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', url, data, options);
  },
  put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PUT', url, data, options);
  },
  delete<T = void>(url: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', url, undefined, options);
  },
};
