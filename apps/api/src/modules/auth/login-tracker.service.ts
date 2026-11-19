import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface LoginAttempt {
  username: string;
  client: string;
  ip: string;
  requestId: string;
}

/** 登录失败保护与审计：账号可用性校验、失败计数/锁定、成败入登录日志。 */
@Injectable()
export class LoginTracker {
  private readonly maxFailures: number;
  private readonly lockMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.maxFailures = config.get<number>('LOGIN_MAX_FAILURES') ?? 5;
    this.lockMs = (config.get<number>('LOGIN_LOCK_MINUTES') ?? 15) * 60_000;
  }

  /** 不可登录（不存在/停用/锁定）时记审计并抛契约错误，返回可继续验证的用户。 */
  ensureLoginable(user: User | null, attempt: LoginAttempt): User {
    if (!user) {
      this.writeLog(attempt, null, 'AUTH_INVALID_CREDENTIALS');
      throw new AppError('AUTH_INVALID_CREDENTIALS');
    }
    if (!user.enabled) {
      this.writeLog(attempt, user.id, 'AUTH_ACCOUNT_DISABLED');
      throw new AppError('AUTH_ACCOUNT_DISABLED');
    }
    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      this.writeLog(attempt, user.id, 'AUTH_ACCOUNT_LOCKED');
      throw new AppError('AUTH_ACCOUNT_LOCKED');
    }
    return user;
  }

  async recordPasswordFailure(user: User, attempt: LoginAttempt): Promise<void> {
    const failures = user.failedAttempts + 1;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: failures,
        lockUntil: failures >= this.maxFailures ? new Date(Date.now() + this.lockMs) : null,
      },
    });
    this.writeLog(attempt, user.id, 'AUTH_INVALID_CREDENTIALS');
  }

  async recordSuccess(user: User, attempt: LoginAttempt): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: attempt.ip,
      },
    });
    this.writeLog(attempt, user.id, null);
  }

  private writeLog(attempt: LoginAttempt, userId: number | null, message: string | null): void {
    this.audit.recordLogin({
      username: attempt.username,
      userId,
      client: attempt.client,
      ip: attempt.ip,
      status: message === null ? 'ok' : 'error',
      message,
      requestId: attempt.requestId,
    });
  }
}
