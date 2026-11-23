import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AiAction } from '@prisma/client';
import { AppError } from '../../../common/app-error';
import { PrismaService } from '../../../prisma/prisma.service';
import { AI_ACTION_STATUS, CONFIRMATION_TTL_MS } from '../ai.constants';
import { stableStringify } from '../redaction';

export interface IssuedTicket {
  ticket: string;
  expiresAt: Date;
}

interface TicketBinding {
  ticket: string;
  actionId: number;
  userId: number;
  payload: Record<string, unknown>;
}

interface BeginConfirmInput {
  actionId: number;
  userId: number;
  ticket?: string | undefined;
  payload: Record<string, unknown>;
}

function hashTicket({ ticket, actionId, userId, payload }: TicketBinding): string {
  return createHash('sha256')
    .update(`${ticket}:${actionId}:${userId}:${stableStringify(payload)}`)
    .digest('hex');
}

/** 服务端一次性确认票据：只存哈希，绑定动作、用户与参数摘要。 */
@Injectable()
export class ConfirmationService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(
    actionId: number,
    userId: number,
    payload: Record<string, unknown>,
  ): Promise<IssuedTicket> {
    const ticket = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS);
    const ticketHash = hashTicket({ ticket, actionId, userId, payload });
    await this.prisma.aiConfirmation.upsert({
      where: { actionId },
      update: { ticketHash, expiresAt, usedAt: null },
      create: { actionId, ticketHash, expiresAt },
    });
    return { ticket, expiresAt };
  }

  async ownedAction(actionId: number, userId: number): Promise<AiAction> {
    const action = await this.prisma.aiAction.findUnique({
      where: { id: actionId },
      include: { conversation: { select: { userId: true } } },
    });
    if (!action || action.conversation.userId !== userId) {
      throw new AppError('AI_ACTION_NOT_FOUND');
    }
    return action;
  }

  /**
   * 校验票据并把动作推进到 executing。已结束的动作原样返回（幂等）。
   * 票据与状态更新在同一事务内条件更新，并发确认只有一个能成功。
   */
  async beginConfirm(input: BeginConfirmInput): Promise<AiAction> {
    const action = await this.ownedAction(input.actionId, input.userId);
    if (action.status === AI_ACTION_STATUS.executed || action.status === AI_ACTION_STATUS.failed) {
      return action;
    }
    if (
      action.status === AI_ACTION_STATUS.cancelled ||
      action.status === AI_ACTION_STATUS.executing ||
      action.status === AI_ACTION_STATUS.draft
    ) {
      throw new AppError('AI_ACTION_CONFLICT');
    }
    if (input.ticket === undefined || input.ticket === '') {
      throw new AppError('AI_CONFIRMATION_REQUIRED');
    }
    await this.consume(input);
    return action;
  }

  private async consume(input: BeginConfirmInput): Promise<void> {
    try {
      await this.transaction(input);
    } catch (error) {
      if (error instanceof AppError && error.code === 'AI_CONFIRMATION_EXPIRED') {
        // 并发确认时票据可能刚被另一个请求消费；状态已变化则按冲突返回
        const latest = await this.ownedAction(input.actionId, input.userId);
        if (latest.status !== AI_ACTION_STATUS.awaiting) {
          throw new AppError('AI_ACTION_CONFLICT');
        }
      }
      throw error;
    }
  }

  private async transaction(input: BeginConfirmInput): Promise<void> {
    const ticketHash = hashTicket({
      ticket: input.ticket ?? '',
      actionId: input.actionId,
      userId: input.userId,
      payload: input.payload,
    });
    await this.prisma.$transaction(async (tx) => {
      const used = await tx.aiConfirmation.updateMany({
        where: {
          actionId: input.actionId,
          ticketHash,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1) {
        throw new AppError('AI_CONFIRMATION_EXPIRED');
      }
      const moved = await tx.aiAction.updateMany({
        where: { id: input.actionId, status: AI_ACTION_STATUS.awaiting },
        data: { status: AI_ACTION_STATUS.executing },
      });
      if (moved.count !== 1) {
        throw new AppError('AI_ACTION_CONFLICT');
      }
    });
  }

  async finish(
    actionId: number,
    status: 'executed' | 'failed',
    data: { requestId: string; errorCode?: string | null; result?: unknown },
  ): Promise<AiAction> {
    // 只有已进入 executing 的动作才能终态化，避免并发取消/拒绝覆盖执行中状态
    await this.prisma.aiAction.updateMany({
      where: { id: actionId, status: AI_ACTION_STATUS.executing },
      data: {
        status,
        requestId: data.requestId,
        errorCode: data.errorCode ?? null,
        ...(data.result === undefined ? {} : { result: data.result as object }),
      },
    });
    return this.prisma.aiAction.findUniqueOrThrow({ where: { id: actionId } });
  }

  /** 权限校验失败时仅能终结仍待确认的动作；返回 false 表示状态已被并发请求改变。 */
  async failAwaiting(
    actionId: number,
    data: { requestId: string; errorCode: string },
  ): Promise<boolean> {
    const updated = await this.prisma.aiAction.updateMany({
      where: { id: actionId, status: AI_ACTION_STATUS.awaiting },
      data: {
        status: AI_ACTION_STATUS.failed,
        requestId: data.requestId,
        errorCode: data.errorCode,
      },
    });
    return updated.count === 1;
  }

  /** access token 过期不消耗动作：回到待确认，并延长票据有效期供重新登录后重试。 */
  async releaseAfterAuthExpired(actionId: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.aiAction.updateMany({
        where: { id: actionId, status: AI_ACTION_STATUS.executing },
        data: { status: AI_ACTION_STATUS.awaiting, errorCode: 'AUTH_TOKEN_EXPIRED' },
      }),
      this.prisma.aiConfirmation.updateMany({
        where: { actionId },
        data: { usedAt: null, expiresAt: new Date(Date.now() + CONFIRMATION_TTL_MS) },
      }),
    ]);
  }

  async cancel(actionId: number, userId: number): Promise<AiAction> {
    const action = await this.ownedAction(actionId, userId);
    if (action.status !== AI_ACTION_STATUS.awaiting && action.status !== AI_ACTION_STATUS.draft) {
      throw new AppError('AI_ACTION_CONFLICT');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.aiAction.updateMany({
        where: {
          id: actionId,
          status: { in: [AI_ACTION_STATUS.awaiting, AI_ACTION_STATUS.draft] },
        },
        data: { status: AI_ACTION_STATUS.cancelled },
      });
      if (updated.count !== 1) {
        throw new AppError('AI_ACTION_CONFLICT');
      }
      await tx.aiConfirmation.deleteMany({ where: { actionId } });
      return tx.aiAction.findUniqueOrThrow({ where: { id: actionId } });
    });
  }
}
