import {
  type CurrentUser,
  type LoginRequest,
  type LoginResponse,
  type Profile,
  type RefreshResponse,
  type ChangePasswordRequest,
  type UpdateProfileRequest,
} from '@tiangong/contracts';
import { hash, verify } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface IssuedTokens {
  accessToken: string;
  accessExpiresIn: number;
  refreshToken: string;
}

/** 认证服务：登录（防爆破+审计）、双 token 签发与轮换、个人中心。 */
@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly maxFailures: number;
  private readonly lockMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    this.accessTtl = this.config.get<number>('ACCESS_TOKEN_TTL') ?? 900;
    this.refreshTtl = this.config.get<number>('REFRESH_TOKEN_TTL') ?? 604800;
    this.maxFailures = this.config.get<number>('LOGIN_MAX_FAILURES') ?? 5;
    this.lockMs = (this.config.get<number>('LOGIN_LOCK_MINUTES') ?? 15) * 60_000;
  }

  async login(
    body: LoginRequest,
    ip: string,
    requestId: string,
  ): Promise<LoginResponse & IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { username: body.username } });
    if (!user) {
      this.recordLoginFail(body, null, 'AUTH_INVALID_CREDENTIALS', ip, requestId);
      throw new AppError('AUTH_INVALID_CREDENTIALS');
    }
    if (!user.enabled) {
      this.recordLoginFail(body, user.id, 'AUTH_ACCOUNT_DISABLED', ip, requestId);
      throw new AppError('AUTH_ACCOUNT_DISABLED');
    }
    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      this.recordLoginFail(body, user.id, 'AUTH_ACCOUNT_LOCKED', ip, requestId);
      throw new AppError('AUTH_ACCOUNT_LOCKED');
    }

    const passwordOk = await verify(user.passwordHash, body.password);
    if (!passwordOk) {
      const failures = user.failedAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: failures,
          lockUntil: failures >= this.maxFailures ? new Date(Date.now() + this.lockMs) : null,
        },
      });
      this.recordLoginFail(body, user.id, 'AUTH_INVALID_CREDENTIALS', ip, requestId);
      throw new AppError('AUTH_INVALID_CREDENTIALS');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
    });
    this.audit.recordLogin({
      username: user.username,
      userId: user.id,
      client: body.client,
      ip,
      status: 'ok',
      message: null,
      requestId,
    });
    const issued = await this.issueTokens(user.id, user.username, body.client);
    return { ...issued, user: await this.currentUser(user.id) };
  }

  /** 刷新 access token：refresh 轮换（旧值吊销并登记替换）。 */
  async refresh(rawToken: string, client: string): Promise<RefreshResponse & IssuedTokens> {
    const tokenHash = sha256(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now() ||
      !stored.user.enabled
    ) {
      throw new AppError('AUTH_REFRESH_INVALID');
    }
    const issued = await this.issueTokens(stored.user.id, stored.user.username, client);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByHash: sha256(issued.refreshToken) },
    });
    return issued;
  }

  /** 登出：吊销携带的 refresh token（Web 端在 Cookie 中）。 */
  async logout(rawToken: string | null, userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (rawToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: sha256(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
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

  private recordLoginFail(
    body: LoginRequest,
    userId: number | null,
    code: string,
    ip: string,
    requestId: string,
  ): void {
    this.audit.recordLogin({
      username: body.username,
      userId,
      client: body.client,
      ip,
      status: 'error',
      message: code,
      requestId,
    });
  }

  private async issueTokens(
    userId: number,
    username: string,
    client: string,
  ): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId, username, client });
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: sha256(refreshToken),
        userId,
        client,
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });
    return { accessToken, accessExpiresIn: this.accessTtl, refreshToken };
  }

  private async resolvePermissionStrings(userId: number): Promise<string[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { role: { users: { some: { userId } } } },
      include: { permission: true },
    });
    return [...new Set(rows.map((r) => `${r.permission.resource}:${r.permission.action}`))];
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
