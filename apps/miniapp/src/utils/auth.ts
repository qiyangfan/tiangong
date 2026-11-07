/** 会话凭据存取：access/refresh 均落本地存储（小程序无 HttpOnly Cookie）。 */
const ACCESS_KEY = 'tg_access_token';
const REFRESH_KEY = 'tg_refresh_token';
const USER_KEY = 'tg_user';

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
}

export function storeAccessToken(accessToken: string): void {
  uni.setStorageSync(ACCESS_KEY, accessToken);
}

export function clearSession(): void {
  uni.removeStorageSync(ACCESS_KEY);
  uni.removeStorageSync(REFRESH_KEY);
  uni.removeStorageSync(USER_KEY);
}
