import type {
  CreateUserRequest,
  PageResult,
  ResetPasswordRequest,
  UpdateUserRequest,
  UserItem,
  UserListQuery,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

function toParams(query: UserListQuery): QueryParams {
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword,
    enabled: query.enabled === undefined ? undefined : String(query.enabled),
    roleId: query.roleId,
  };
}

export function apiListUsers(query: UserListQuery): Promise<PageResult<UserItem>> {
  return http.get('/users', { params: toParams(query) });
}

export function apiGetUser(id: number): Promise<UserItem> {
  return http.get(`/users/${id}`);
}

export function apiCreateUser(data: CreateUserRequest): Promise<UserItem> {
  return http.post('/users', data);
}

export function apiUpdateUser(id: number, data: UpdateUserRequest): Promise<UserItem> {
  return http.put(`/users/${id}`, data);
}

export function apiDeleteUser(id: number): Promise<void> {
  return http.delete(`/users/${id}`);
}

export function apiResetUserPassword(id: number, data: ResetPasswordRequest): Promise<void> {
  return http.post(`/users/${id}/reset-password`, data);
}

export function apiSetUserEnabled(id: number, enabled: boolean): Promise<UserItem> {
  return http.put(`/users/${id}/enabled`, { enabled });
}
