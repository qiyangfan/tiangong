import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AiAction as AiActionRow } from '@prisma/client';
import type { AiAction } from '@tiangong/contracts';
import { AppError } from '../../common/app-error';
import type { AuthenticatedUser } from '../../security/current-user.decorator';
import { AI_ACTION_STATUS } from './ai.constants';
import { asRecord, toAction } from './ai.mapper';
import { AiServices, AiToolServices } from './ai-runtime';
import type { ToolCatalogEntry } from './tools/tool-catalog.service';
import { storedResult } from './tools/tool-executor.service';

export interface ConfirmInput {
  actionId: number;
  user: AuthenticatedUser;
  ticket?: string | undefined;
  token: string;
}

interface ExecuteInput {
  action: AiActionRow;
  entry: ToolCatalogEntry;
  payload: Record<string, unknown>;
  token: string;
}

/** 写操作确认：票据核验、并发状态机与同权执行；工具失败以动作状态返回。 */
@Injectable()
export class AiActionService {
  constructor(
    private readonly services: AiServices,
    private readonly tools: AiToolServices,
  ) {}

  async confirm(input: ConfirmInput): Promise<AiAction> {
    this.services.settings.assertEnabled();
    const action = await this.tools.confirmation.ownedAction(input.actionId, input.user.id);
    if (this.isFinished(action.status)) {
      return toAction(action);
    }
    if (action.status !== AI_ACTION_STATUS.awaiting) {
      throw new AppError('AI_ACTION_CONFLICT');
    }
    return this.confirmAction(input, action);
  }

  async cancel(actionId: number, userId: number): Promise<AiAction> {
    this.services.settings.assertEnabled();
    return toAction(await this.tools.confirmation.cancel(actionId, userId));
  }

  private async confirmAction(input: ConfirmInput, action: AiActionRow): Promise<AiAction> {
    const entry = this.tools.catalog.find(action.toolName, input.user.permissions);
    if (!entry || entry.method !== action.method || entry.path !== action.path) {
      return this.rejectPermission(action.id);
    }
    const payload = asRecord(action.payload);
    const moved = await this.begin({
      actionId: action.id,
      userId: input.user.id,
      ticket: input.ticket,
      payload,
    });
    if (this.isFinished(moved.status)) {
      return toAction(moved);
    }
    return this.execute({ action, entry, payload, token: input.token });
  }

  private async begin(input: {
    actionId: number;
    userId: number;
    ticket?: string | undefined;
    payload: Record<string, unknown>;
  }) {
    try {
      return await this.tools.confirmation.beginConfirm(input);
    } catch (error) {
      if (error instanceof AppError && error.code === 'AI_ACTION_CONFLICT') {
        const latest = await this.tools.confirmation.ownedAction(input.actionId, input.userId);
        if (this.isFinished(latest.status)) {
          return latest;
        }
      }
      throw error;
    }
  }

  private async execute(input: ExecuteInput): Promise<AiAction> {
    const result = await this.tools.executor.execute(input.entry, input.payload, input.token);
    if (!result.ok && result.authExpired) {
      await this.tools.confirmation.releaseAfterAuthExpired(input.action.id);
      throw new AppError('AUTH_TOKEN_EXPIRED');
    }
    const finished = await this.tools.confirmation.finish(
      input.action.id,
      result.ok ? 'executed' : 'failed',
      {
        requestId: result.requestId,
        errorCode: result.code,
        ...(result.ok ? { result: storedResult(result.data) } : {}),
      },
    );
    return toAction(finished);
  }

  private async rejectPermission(actionId: number): Promise<never> {
    const marked = await this.tools.confirmation.failAwaiting(actionId, {
      requestId: randomUUID(),
      errorCode: 'AUTH_FORBIDDEN',
    });
    if (!marked) {
      throw new AppError('AI_ACTION_CONFLICT');
    }
    throw new AppError('AUTH_FORBIDDEN');
  }

  private isFinished(status: string): boolean {
    return status === AI_ACTION_STATUS.executed || status === AI_ACTION_STATUS.failed;
  }
}
