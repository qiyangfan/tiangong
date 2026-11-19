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

/** 错误载荷（错误码、文案、请求 id、HTTP 状态）集中以对象传递，避免长参数表。 */
interface TgErrorInit {
  code: string;
  message: string;
  requestId?: string;
  status?: number;
}

function tgError({ code, message, requestId, status }: TgErrorInit): TgError {
  const err = new Error(message) as TgError;
  err.code = code;
  err.requestId = requestId;
  err.status = status;
  return err;
}

function isEnvelope(body: unknown): body is ApiSuccess<unknown> | ApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    (typeof body.code === 'number' || typeof body.code === 'string')
  );
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

/** 错误码命中已知表则用本地文案，否则回落服务端 message。 */
function apiErrorText(code: string, message: string): string {
  const key = KNOWN_ERRORS[code];
  return key ? i18nT(key) : message || i18nT('error.serverError');
}

function showApiError(err: TgError): void {
  ElMessage.error(apiErrorText(err.code, err.message));
}

/**
 * 信封判别：业务码取值来自契约 ERROR_CODES（code 恒为字符串），故按错误侧结构收窄。
 * 仅本文件内的解包使用，不外泄为通用类型守卫。
 */
function asApiError(body: ApiSuccess<unknown> | ApiError): ApiError {
  return body as ApiError;
}

/** 失败 envelope → 统一 TgError（成功 envelope 不带 message/requestId）。 */
function fromFailure(response: AxiosResponse, body: ApiError): TgError {
  return tgError({
    code: body.code,
    message: body.message,
    requestId: body.requestId,
    status: response.status,
  });
}

/** 受保护路径的 HTTP 401：会话级事件（过期/无效/被停用统一按状态码判定）。 */
function isSessionDead(config: TgRequestConfig | undefined, status: number | undefined): boolean {
  return status === 401 && !!config && !isAuthPath(config.url);
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

/** 合并并发 401 到同一次 tokenBus.refresh()。 */
function shareRefresh(): Promise<boolean> {
  refreshing ??= tokenBus.refresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** 响应拦截成功侧：envelope 解包 {code:0,data} → data；非 envelope 响应透传。 */
function unwrapEnvelope(response: AxiosResponse): AxiosResponse {
  const body: unknown = response.data;
  if (!isEnvelope(body)) {
    return response;
  }
  if (body.code !== SUCCESS_CODE) {
    throw fromFailure(response, asApiError(body));
  }
  response.data = body.data;
  return response;
}

/** 错误载荷里的契约错误码：优先取 envelope 的字符串码，缺失则回落 HTTP_<status>。 */
function errorCodeOf(body: ApiError | undefined, status: number | undefined): string {
  return body && typeof body.code === 'string' ? body.code : `HTTP_${status ?? 0}`;
}

/** 终局 401 与可提示失败的分流：会话清理不再叠加错误提示。 */
function settleTerminal(
  err: TgError,
  config: TgRequestConfig | undefined,
  sessionDead: boolean,
): void {
  if (sessionDead) {
    // 终局 401（刷新失败或重放仍被拒）：会话不可用，清理并引导重登；
    // 终局码随事件上交供会话方区分提示（停用/过期），此处不再叠加错误提示
    tokenBus.onSessionExpired(err.code);
    return;
  }
  if (!config?.silent) {
    showApiError(err);
  }
}

/** 会话级 401 且尚未重放过时，刷新成功后带重放标记重新发起原请求；不可重放返回 null。 */
async function replayAfterRefresh(config: TgRequestConfig): Promise<AxiosResponse | null> {
  if (config.__retried || !(await shareRefresh())) {
    return null;
  }
  // __retried 只在本层标记重放，避免刷新成功后再次进入刷新分支
  config.__retried = true;
  return service.request(config);
}

/** 响应拦截失败侧：刷新后重放一次；终局 401 交会话方清理，其余弹统一提示。 */
async function handleResponseError(error: AxiosError): Promise<AxiosResponse> {
  const config = error.config as TgRequestConfig | undefined;
  const status = error.response?.status;
  const body = error.response?.data as ApiError | undefined;
  const sessionDead = isSessionDead(config, status);

  const replay = config && sessionDead ? await replayAfterRefresh(config) : null;
  if (replay) {
    return replay;
  }
  const err = tgError({
    code: errorCodeOf(body, status),
    message: body?.message ?? error.message,
    requestId: body?.requestId,
    status,
  });
  settleTerminal(err, config, sessionDead);
  throw err;
}

service.interceptors.response.use(unwrapEnvelope, handleResponseError);

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
