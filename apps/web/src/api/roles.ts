import type {
  CreateRoleRequest,
  PageResult,
  RoleDetail,
  RoleItem,
  RoleListQuery,
  UpdateRoleRequest,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

function toParams(query: RoleListQuery): QueryParams {
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword,
    enabled: query.enabled === undefined ? undefined : String(query.enabled),
  };
}

export function apiListRoles(query: RoleListQuery): Promise<PageResult<RoleItem>> {
  return http.get('/roles', { params: toParams(query) });
}

export function apiGetRole(id: number): Promise<RoleDetail> {
  return http.get(`/roles/${id}`);
}

export function apiCreateRole(data: CreateRoleRequest): Promise<RoleDetail> {
  return http.post('/roles', data);
}

export function apiUpdateRole(id: number, data: UpdateRoleRequest): Promise<RoleDetail> {
  return http.put(`/roles/${id}`, data);
}

export function apiDeleteRole(id: number): Promise<void> {
  return http.delete(`/roles/${id}`);
}
