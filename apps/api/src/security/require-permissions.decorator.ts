import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_METADATA = 'tiangong:permissions';

/**
 * 声明路由所需的 API 权限点（resource:action，须全部满足）。
 * 服务端强制校验、默认拒绝；超管（*:*:*）直通。前端按钮显隐只是展示层。
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_METADATA, permissions);
