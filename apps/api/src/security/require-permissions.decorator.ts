import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

export const PERMISSIONS_METADATA = 'tiangong:permissions';

/**
 * 声明路由所需的 API 权限点（resource:action，须全部满足）。
 * 服务端强制校验、默认拒绝；超管（*:*:*）直通。前端按钮显隐只是展示层。
 * 同步写入 OpenAPI 扩展（x-required-permissions），使文档快照成为路由 + 权限的机器可读单源。
 */
export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_METADATA, permissions),
    ApiExtension('x-required-permissions', permissions),
  );
