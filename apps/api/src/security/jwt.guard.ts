import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AppError } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_METADATA } from './public.decorator';
import { AuthenticatedUser } from './current-user.decorator';
import { getRequestContext } from '../common/request-context';

export const REFRESH_COOKIE = 'tg_refresh';

interface AccessPayload {
  sub: number;
  username: string;
  client: string;
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

function extractToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('AUTH_UNAUTHENTICATED');
  }
  return header.slice('Bearer '.length);
}

/** 全局 JWT 守卫：非 @Public 路由必须携带有效 Bearer access token；身份与权限实时取库。 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const payload = await this.verifyToken(extractToken(req));
    const user = await this.loadEnabledUser(payload.sub);
    return this.attachUser(req, user, payload.client);
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }

  private async verifyToken(token: string): Promise<AccessPayload> {
    try {
      return await this.jwt.verifyAsync<AccessPayload>(token);
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError') {
        throw new AppError('AUTH_TOKEN_EXPIRED');
      }
      throw new AppError('AUTH_TOKEN_INVALID');
    }
  }

  private async loadEnabledUser(userId: number): Promise<{
    id: number;
    username: string;
    roles: Array<{ role: { roleKey: string } }>;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.enabled) {
      throw new AppError('AUTH_UNAUTHENTICATED');
    }
    return user;
  }

  private async attachUser(
    req: AuthenticatedRequest,
    user: { id: number; username: string; roles: Array<{ role: { roleKey: string } }> },
    client: string,
  ): Promise<boolean> {
    const roleKeys = user.roles.map((ur) => ur.role.roleKey);
    const permissions = roleKeys.includes('superadmin')
      ? ['*:*:*']
      : await this.resolvePermissions(user.id);
    req.user = { id: user.id, username: user.username, roles: roleKeys, permissions };
    const ctx = getRequestContext();
    if (ctx) {
      ctx.userId = user.id;
      ctx.username = user.username;
      ctx.client = client;
    }
    return true;
  }

  /** 汇总用户全部角色的权限点。 */
  private async resolvePermissions(userId: number): Promise<string[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { role: { users: { some: { userId } } } },
      include: { permission: true },
    });
    return [...new Set(rows.map((r) => `${r.permission.resource}:${r.permission.action}`))];
  }
}
