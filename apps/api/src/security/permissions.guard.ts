import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../common/app-error';
import { PERMISSIONS_METADATA } from './require-permissions.decorator';
import { AuthenticatedUser } from './current-user.decorator';
import { Request } from 'express';

const SUPER_WILDCARD = '*:*:*';

/** 权限守卫（JwtGuard 之后）：声明了 @RequirePermissions 的路由须全部命中；默认拒绝。 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.requiredPermissions(context);
    if (required.length === 0) {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    return this.isAllowed(req.user, required);
  }

  private requiredPermissions(context: ExecutionContext): string[] {
    return (
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? []
    );
  }

  private isAllowed(user: AuthenticatedUser | undefined, required: string[]): boolean {
    if (!user) {
      return false;
    }
    if (user.permissions.includes(SUPER_WILDCARD)) {
      return true;
    }
    if (!required.every((p) => user.permissions.includes(p))) {
      throw new AppError('AUTH_FORBIDDEN');
    }
    return true;
  }
}
