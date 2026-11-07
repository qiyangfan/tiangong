import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_METADATA = 'tiangong:isPublic';

/** 标注无需认证的路由（登录/刷新/探针）。无此标注的路由一律要求 Bearer token。 */
export const Public = () => SetMetadata(IS_PUBLIC_METADATA, true);
