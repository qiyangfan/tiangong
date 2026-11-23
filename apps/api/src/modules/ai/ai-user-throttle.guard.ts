import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../../common/app-error';
import type { AuthenticatedUser } from '../../security/current-user.decorator';
import { AI_RATE_WINDOW_MS } from './ai.constants';

const AI_THROTTLE_METADATA = 'tiangong:aiThrottle';

interface Window {
  start: number;
  count: number;
}

/** 按 userId 的进程内固定窗口限流；P1 单实例，多副本需网关/共享存储承担。 */
@Injectable()
export class AiUserThrottleGuard implements CanActivate {
  private readonly windows = new Map<string, Window>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const limit = this.reflector.get<number | undefined>(
      AI_THROTTLE_METADATA,
      context.getHandler(),
    );
    if (limit === undefined) {
      return true;
    }
    const key = this.keyOf(context);
    return key === undefined ? true : this.consume(key, limit);
  }

  private keyOf(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    if (!req.user) {
      return undefined;
    }
    return `${req.user.id}:${context.getClass().name}.${context.getHandler().name}`;
  }

  private consume(key: string, limit: number): boolean {
    const now = Date.now();
    const window = this.windows.get(key);
    if (!window || now - window.start >= AI_RATE_WINDOW_MS) {
      this.windows.set(key, { start: now, count: 1 });
      this.prune(now);
      return true;
    }
    window.count += 1;
    if (window.count > limit) {
      throw new AppError('AUTH_RATE_LIMITED');
    }
    return true;
  }

  private prune(now: number): void {
    if (this.windows.size < 1024) {
      return;
    }
    for (const [key, window] of this.windows) {
      if (now - window.start >= AI_RATE_WINDOW_MS) {
        this.windows.delete(key);
      }
    }
  }
}

export const AiThrottle = (limit: number) =>
  applyDecorators(SetMetadata(AI_THROTTLE_METADATA, limit), UseGuards(AiUserThrottleGuard));
