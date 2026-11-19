import {
  type ChangePasswordRequest,
  type CurrentUser,
  type LoginRequest,
  type LoginResponse,
  type Profile,
  type RefreshResponse,
  type UpdateProfileRequest,
} from '@tiangong/contracts';
import { hash, verify } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginTracker, type LoginAttempt } from './login-tracker.service';
import { TokenService, type IssuedTokens } from './token.service';

/** 认证服务：登录（防爆破+审计）、双 token 签发与轮换、个人中心。 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly tracker: LoginTracker,
  ) {}

  async login(
    body: LoginRequest,
    ip: string,
    requestId: string,
  ): Promise<LoginResponse & IssuedTokens> {
    const attempt: LoginAttempt = {
      username: body.username,
      client: body.client,
      ip,
      requestId,
    };
    const user = await this.prisma.user.findUnique({ where: { username: body.username } });
    const loginable = this.tracker.ensureLoginable(user, attempt);
    await this.assertPassword(loginable, body.password, attempt);
    await this.tracker.recordSuccess(loginable, attempt);
    const issued = await this.tokens.issue(loginable.id, loginable.username, body.client);
    return { ...issued, user: await this.currentUser(loginable.id) };
  }

  /** 刷新 access token：refresh 轮换（旧值吊销并登记替换）。 */
  async refresh(rawToken: string, client: string): Promise<RefreshResponse & IssuedTokens> {
    return this.tokens.rotate(rawToken, client);
  }

  /** 登出：吊销携带的 refresh token（Web 端在 Cookie 中）。 */
  async logout(rawToken: string | null, userId: number): Promise<void> {
    await this.tokens.revoke(rawToken, userId);
  }

  async currentUser(userId: number): Promise<CurrentUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    const roleKeys = user.roles.map((ur) => ur.role.roleKey);
    const permissions = roleKeys.includes('superadmin')
      ? ['*:*:*']
      : await this.resolvePermissionStrings(userId);
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      roles: roleKeys,
      permissions,
    };
  }

  async profile(userId: number): Promise<Profile> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      avatarFileId: user.avatarFileId,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }

  async updateProfile(userId: number, body: UpdateProfileRequest): Promise<Profile> {
    if (body.email) {
      const taken = await this.prisma.user.findFirst({
        where: { email: body.email, NOT: { id: userId } },
      });
      if (taken) {
        throw new AppError('USER_EMAIL_TAKEN');
      }
    }
    await this.prisma.user.update({ where: { id: userId }, data: { ...body, updatedBy: userId } });
    return this.profile(userId);
  }

  async changePassword(userId: number, body: ChangePasswordRequest): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verify(user.passwordHash, body.oldPassword))) {
      throw new AppError('AUTH_PASSWORD_MISMATCH');
    }
    if (body.oldPassword === body.newPassword) {
      throw new AppError('AUTH_PASSWORD_SAME');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await hash(body.newPassword), updatedBy: userId },
      }),
      // 改密后全端下线
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async assertPassword(user: User, password: string, attempt: LoginAttempt): Promise<void> {
    if (await verify(user.passwordHash, password)) {
      return;
    }
    await this.tracker.recordPasswordFailure(user, attempt);
    throw new AppError('AUTH_INVALID_CREDENTIALS');
  }

  private async resolvePermissionStrings(userId: number): Promise<string[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { role: { users: { some: { userId } } } },
      include: { permission: true },
    });
    return [...new Set(rows.map((r) => `${r.permission.resource}:${r.permission.action}`))];
  }
}
