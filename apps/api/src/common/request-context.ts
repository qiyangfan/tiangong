import { AsyncLocalStorage } from 'node:async_hooks';

/** 每请求上下文：requestId 贯穿日志/异常/审计；身份由 JwtGuard 回填。 */
export interface RequestContext {
  requestId: string;
  userId?: number;
  username?: string;
  client?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** 取当前请求 id（无请求上下文时返回 '-'，如启动期日志）。 */
export function getRequestId(): string {
  return requestContextStorage.getStore()?.requestId ?? '-';
}

/** 取当前请求上下文（可能为 undefined）。 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
