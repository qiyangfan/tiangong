import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  Profile,
  RefreshRequest,
  RefreshResponse,
  UpdateProfileRequest,
  UserMenus,
  UserPermissions,
} from '@tiangong/contracts';
import { http } from '@/utils/request';

export function apiLogin(data: LoginRequest): Promise<LoginResponse> {
  return http.post('/auth/login', data);
}

/** 会话恢复专用：走 HttpOnly Cookie，静默失败（调用方自行兜底）。 */
export function apiRefresh(data: RefreshRequest): Promise<RefreshResponse> {
  return http.post('/auth/refresh', data, { silent: true });
}

export function apiLogout(data: LogoutRequest): Promise<void> {
  return http.post('/auth/logout', data);
}

export function apiGetMenus(): Promise<UserMenus> {
  return http.get('/auth/menus');
}

export function apiGetPermissions(): Promise<UserPermissions> {
  return http.get('/auth/permissions');
}

export function apiGetProfile(): Promise<Profile> {
  return http.get('/auth/profile');
}

export function apiUpdateProfile(data: UpdateProfileRequest): Promise<Profile> {
  return http.put('/auth/profile', data);
}

export function apiChangePassword(data: ChangePasswordRequest): Promise<void> {
  return http.post('/auth/change-password', data);
}
