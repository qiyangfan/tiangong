import type { LoginRequest, LoginResponse, Profile } from '@tiangong/contracts';
import { http } from '@/utils/request';
import type { StoredUser } from '@/utils/auth';

export function apiLogin(body: LoginRequest): Promise<LoginResponse> {
  return http.post('/auth/login', body, { silent: true });
}

export function apiProfile(): Promise<Profile> {
  return http.get('/auth/profile');
}

/** 登出：miniapp 无 Cookie，服务端按当前用户吊销全部 refresh。 */
export function apiLogout(): Promise<void> {
  return http.post('/auth/logout', { client: 'miniapp' });
}

export type { StoredUser };
