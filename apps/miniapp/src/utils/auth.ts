/** 会话凭据存取：access/refresh 均落本地存储（小程序无 HttpOnly Cookie）。 */
const ACCESS_KEY = 'tg_access_token';
const REFRESH_KEY = 'tg_refresh_token';
const USER_KEY = 'tg_user';

/**
 * 终局 401 处理的一次性标记：并发/跨页在途请求会各自走到终局分支，
 * 以「会话死亡周期」为边界收敛为一次清理+跳转+提示；写入新凭据（登录/刷新成功）即开启新周期。
 */
let terminalHandlingClaimed = false;

/** 认领本死亡周期的终局处理；返回 false 表示同周期内已由其他请求处理，调用方仅抛出。 */
export function claimSessionTerminalHandling(): boolean {
  if (terminalHandlingClaimed) {
    return false;
  }
  terminalHandlingClaimed = true;
  return true;
}

export interface StoredUser {
  id: number;
  username: string;
  nickname: string;
}

export function getAccessToken(): string {
  return uni.getStorageSync(ACCESS_KEY) || '';
}

export function getRefreshToken(): string {
  return uni.getStorageSync(REFRESH_KEY) || '';
}

export function getStoredUser(): StoredUser | null {
  return (uni.getStorageSync(USER_KEY) as StoredUser | undefined) ?? null;
}

export function storeSession(accessToken: string, refreshToken: string, user: StoredUser): void {
  uni.setStorageSync(ACCESS_KEY, accessToken);
  uni.setStorageSync(REFRESH_KEY, refreshToken);
  uni.setStorageSync(USER_KEY, user);
  terminalHandlingClaimed = false;
}

export function storeAccessToken(accessToken: string): void {
  uni.setStorageSync(ACCESS_KEY, accessToken);
  terminalHandlingClaimed = false;
}

export function storeRefreshToken(refreshToken: string): void {
  uni.setStorageSync(REFRESH_KEY, refreshToken);
}

export function clearSession(): void {
  uni.removeStorageSync(ACCESS_KEY);
  uni.removeStorageSync(REFRESH_KEY);
  uni.removeStorageSync(USER_KEY);
}
