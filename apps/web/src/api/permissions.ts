import type {
  CreatePermissionRequest,
  PermissionGroup,
  PermissionListQuery,
  UpdatePermissionRequest,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

/** 权限点按 resource 分组返回（系统规模小，不分页）。 */
export function apiListPermissions(query: PermissionListQuery): Promise<PermissionGroup[]> {
  const params: QueryParams = { keyword: query.keyword };
  return http.get('/permissions', { params });
}

export function apiCreatePermission(data: CreatePermissionRequest): Promise<void> {
  return http.post('/permissions', data);
}

export function apiUpdatePermission(id: number, data: UpdatePermissionRequest): Promise<void> {
  return http.patch(`/permissions/${id}`, data);
}

export function apiDeletePermission(id: number): Promise<void> {
  return http.delete(`/permissions/${id}`);
}
