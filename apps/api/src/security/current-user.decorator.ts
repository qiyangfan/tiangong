import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

/** 认证后的请求身份（由 JwtGuard 写入 req.user）。 */
export interface AuthenticatedUser {
  id: number;
  username: string;
  roles: string[];
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    if (!req.user) {
      throw new Error('CurrentUser used outside authenticated route');
    }
    return req.user;
  },
);
