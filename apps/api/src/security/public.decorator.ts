import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

export const IS_PUBLIC_METADATA = 'tiangong:isPublic';

/**
 * 标注无需认证的路由（登录/刷新/探针）。无此标注的路由一律要求 Bearer token。
 * 同步写入 OpenAPI 扩展（x-public），公开面在文档快照中同样可见。
 */
export const Public = () =>
  applyDecorators(SetMetadata(IS_PUBLIC_METADATA, true), ApiExtension('x-public', true));
