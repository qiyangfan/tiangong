/**
 * request 层与 auth store 的解耦桥：main.ts 装配时注入实现。
 * 直接让 request 依赖 store 会形成 store→api→request→store 的模块环。
 */
export interface TokenBus {
  getToken(): string | null;
  /** 用 refresh Cookie 换新 access token；成功 true，失败 false。 */
  refresh(): Promise<boolean>;
  /**
   * 会话彻底失效（刷新失败或重放仍被 401 拒绝）：清理状态并引导重登。
   * code 为终局请求的契约错误码，用于区分提示文案（停用/过期）。
   */
  onSessionExpired(code?: string): void;
}

export const tokenBus: TokenBus = {
  getToken: () => null,
  refresh: async () => false,
  onSessionExpired: () => {},
};

export function bindTokenBus(impl: TokenBus): void {
  Object.assign(tokenBus, impl);
}
