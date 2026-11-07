import { SUCCESS_CODE, type ApiError } from '@tiangong/contracts';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  storeAccessToken,
  storeRefreshToken,
} from './auth';

/** API 基地址：编译期由 VITE_API_BASE_URL 注入（真机需 https 且配域名白名单）。 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

/** 业务错误：携带契约错误码，调用方按需分支。 */
export interface TgError extends Error {
  code: string;
  status?: number;
}

function tgError(code: string, message: string, status?: number): TgError {
  const err = new Error(message) as TgError;
  err.code = code;
  err.status = status;
  return err;
}

interface RequestOptions {
  /** 静默模式：失败不弹 toast（后台刷新等场景）。 */
  silent?: boolean;
}

function showError(err: TgError): void {
  uni.showToast({ title: err.message || '请求失败', icon: 'none' });
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
          reject(tgError(`HTTP_${res.statusCode}`, 'unexpected response', res.statusCode));
          return;
        }
        if (body.code === SUCCESS_CODE) {
          resolve(body.data as T);
          return;
        }
        const apiError = body as unknown as ApiError;
        reject(tgError(apiError.code, apiError.message, res.statusCode));
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
    const authDead = e.code === 'AUTH_TOKEN_INVALID';
    if (e.code === 'AUTH_TOKEN_EXPIRED' && !retried && !url.startsWith('/auth/')) {
      refreshing ??= refreshSession().finally(() => {
        refreshing = null;
      });
      if (await refreshing) {
        return request<T>(method, url, data, options, true);
      }
      // 刷新失败 = 会话不可恢复：清会话回登录（与 web request 层同语义）
      clearSession();
      gotoLogin();
    }
    if (authDead || (e.code === 'AUTH_TOKEN_EXPIRED' && retried)) {
      clearSession();
      gotoLogin();
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
