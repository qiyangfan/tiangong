import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { SUCCESS_CODE, type ApiError, type ApiSuccess } from '@tiangong/contracts';
import { ElMessage } from 'element-plus';
import { i18n } from '@/locales';
import { tokenBus } from './token-bus';

/** GET 查询参数允许的形态（undefined 项由 axios 自动省略）。 */
export type QueryParams = Record<string, string | number | boolean | undefined>;

interface TgRequestConfig extends AxiosRequestConfig {
  /** 已因 401 刷新而重放过一次，防止循环重放。 */
  __retried?: boolean;
  /** 静默模式：失败不弹全局提示（后台轮询、会话恢复等场景）。 */
  silent?: boolean;
}

/** 统一请求错误：携带契约错误码，调用方按需分支处理。 */
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

function isEnvelope(body: unknown): body is ApiSuccess<unknown> | ApiError {
  if (typeof body !== 'object' || body === null || !('code' in body)) {
    return false;
  }
  const code = (body as { code: unknown }).code;
  return typeof code === 'number' || typeof code === 'string';
}

/** refresh Cookie 覆盖的路径（401 刷新重放对这些路径没有意义）。 */
const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

function isAuthPath(url: string | undefined): boolean {
  return typeof url === 'string' && AUTH_PATHS.some((p) => url.startsWith(p));
}

/** 已知错误码 → i18n 文案键；未收录的码直接展示服务端 message。 */
const KNOWN_ERRORS: Record<string, string> = {
  AUTH_FORBIDDEN: 'error.forbidden',
  AUTH_UNAUTHENTICATED: 'layout.sessionExpired',
  AUTH_ACCOUNT_DISABLED: 'error.accountDisabled',
  AUTH_RATE_LIMITED: 'error.rateLimited',
};

function i18nT(key: string): string {
  return i18n.global.t(key);
}

function showApiError(err: TgError): void {
  const key = KNOWN_ERRORS[err.code];
  const text = key ? i18nT(key) : err.message || i18nT('error.serverError');
  ElMessage.error(text);
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
});

service.interceptors.request.use((config) => {
  const token = tokenBus.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 单飞刷新：并发请求共享同一次 refresh，成功后各自重放一次（RuoYi 防抖语义）
let refreshing: Promise<boolean> | null = null;

service.interceptors.response.use(
  (response) => {
    // envelope 解包：{code:0,data} → data；非 envelope 响应透传
    const body: unknown = response.data;
    if (isEnvelope(body)) {
      if (body.code === SUCCESS_CODE) {
        response.data = (body as ApiSuccess<unknown>).data;
        return response;
      }
      const e = body as ApiError;
      throw tgError(e.code, e.message, e.requestId, response.status);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as TgRequestConfig | undefined;
    const status = error.response?.status;
    const body = error.response?.data as ApiError | undefined;
    const code = body && typeof body.code === 'string' ? body.code : `HTTP_${status ?? 0}`;
    const message = body?.message ?? error.message;
    // 受保护路径的 HTTP 401 是会话级事件（过期/无效/被停用统一按状态码判定）；
    // auth 路径（登录/刷新/登出）的 401 是操作本身的预期结果，不得触发全局会话清理
    const sessionDead = status === 401 && !!config && !isAuthPath(config.url);

    if (sessionDead && !config.__retried) {
      refreshing ??= tokenBus.refresh().finally(() => {
        refreshing = null;
      });
      const ok = await refreshing;
      if (ok) {
        config.__retried = true;
        return service.request(config);
      }
    }
    const err = tgError(code, message, body?.requestId, status);
    if (sessionDead) {
      // 终局 401（刷新失败或重放仍被拒）：会话不可用，清理并引导重登；
      // 终局码随事件上交供会话方区分提示（停用/过期），此处不再叠加错误提示
      tokenBus.onSessionExpired(err.code);
    }

    if (!config?.silent && !sessionDead) {
      showApiError(err);
    }
    throw err;
  },
);

/**
 * 契约化请求层：泛型 T 是 envelope 解包后的 data。
 * 响应拦截器已把 response.data 替换为 envelope 的 data，此处再剥掉 AxiosResponse 壳。
 */
function unwrap<T>(promise: Promise<AxiosResponse>): Promise<T> {
  return promise.then((r) => r.data as T);
}

export const http = {
  get<T>(url: string, config?: TgRequestConfig): Promise<T> {
    return unwrap<T>(service.get(url, config));
  },
  post<T>(url: string, data?: unknown, config?: TgRequestConfig): Promise<T> {
    return unwrap<T>(service.post(url, data, config));
  },
  put<T>(url: string, data?: unknown, config?: TgRequestConfig): Promise<T> {
    return unwrap<T>(service.put(url, data, config));
  },
  delete<T = void>(url: string, config?: TgRequestConfig): Promise<T> {
    return unwrap<T>(service.delete(url, config));
  },
};
