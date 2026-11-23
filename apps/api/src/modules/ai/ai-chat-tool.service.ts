import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/app-error';
import type { AuthenticatedUser } from '../../security/current-user.decorator';
import { AI_ACTION_STATUS } from './ai.constants';
import type { CallContext, ReadContext, WriteContext } from './ai-chat.types';
import { hasSensitiveKey, toolContent } from './ai.mapper';
import { AiServices, AiToolServices } from './ai-runtime';
import type { AiToolDefinition } from './provider/ai-provider';
import { redact } from './redaction';
import type { ToolCatalogEntry } from './tools/tool-catalog.service';
import { resultSummary, storedResult } from './tools/tool-executor.service';

/** 工具调用落地：只读直接执行并回灌结果，非 GET 只生成待确认草案。 */
@Injectable()
export class AiChatToolService {
  constructor(
    private readonly services: AiServices,
    private readonly tools: AiToolServices,
  ) {}

  definitions(permissions: string[]): AiToolDefinition[] {
    return this.tools.catalog.definitions(permissions);
  }

  async handle(context: CallContext): Promise<boolean> {
    const args = this.parseArguments(context.call.arguments);
    if (hasSensitiveKey(args)) {
      throw new AppError('VALIDATION_ERROR', 'sensitive parameters are not allowed in AI actions');
    }
    const entry = this.requireTool(context.call.name, context.options.user);
    await this.appendAssistant(context);
    if (entry.method === 'GET') {
      await this.executeRead({ ...context, entry, args });
      return false;
    }
    await this.proposeWrite({ ...context, entry, args });
    return true;
  }

  private async appendAssistant(context: CallContext): Promise<void> {
    if (context.assistantText.trim() !== '') {
      await this.services.conversations.append(
        context.prepared.conversationId,
        'assistant',
        context.assistantText,
      );
    }
  }

  private async executeRead(context: ReadContext): Promise<void> {
    const action = await this.services.prisma.aiAction.create({
      data: {
        conversationId: context.prepared.conversationId,
        toolName: context.entry.wireName,
        method: context.entry.method,
        path: context.entry.path,
        payload: context.args as Prisma.InputJsonValue,
        status: AI_ACTION_STATUS.executing,
      },
    });
    const result = await this.tools.executor.execute(
      context.entry,
      context.args,
      context.options.token,
    );
    await this.tools.confirmation.finish(action.id, result.ok ? 'executed' : 'failed', {
      requestId: result.requestId,
      errorCode: result.code,
      ...(result.ok ? { result: storedResult(result.data) } : {}),
    });
    this.emitResult(action.id, result, context);
    const content = toolContent(result);
    await this.services.conversations.append(context.prepared.conversationId, 'tool', content);
    this.pushToolMessages(context, action.id, content);
  }

  private emitResult(
    actionId: number,
    result: { ok: boolean; code: string | null; data: unknown },
    context: ReadContext,
  ): void {
    if (result.ok) {
      context.writer.write('action.executed', {
        actionId,
        status: 'executed',
        resultSummary: resultSummary(result.data),
      });
      return;
    }
    context.writer.write('action.failed', { actionId, code: result.code ?? 'INTERNAL_ERROR' });
  }

  private pushToolMessages(context: ReadContext, actionId: number, content: string): void {
    const callId = context.call.id ?? `call_${String(actionId)}`;
    context.extra.push(
      {
        role: 'assistant',
        content: context.assistantText.trim() === '' ? null : context.assistantText,
        tool_calls: [
          {
            id: callId,
            type: 'function',
            function: { name: context.entry.wireName, arguments: context.call.arguments },
          },
        ],
      },
      { role: 'tool', tool_call_id: callId, content },
    );
  }

  private async proposeWrite(context: WriteContext): Promise<void> {
    const action = await this.services.prisma.aiAction.create({
      data: {
        conversationId: context.prepared.conversationId,
        toolName: context.entry.wireName,
        method: context.entry.method,
        path: context.entry.path,
        payload: context.args as Prisma.InputJsonValue,
        status: AI_ACTION_STATUS.awaiting,
      },
    });
    const issued = await this.tools.confirmation.issue(
      action.id,
      context.options.user.id,
      context.args,
    );
    context.writer.write('action.proposed', {
      actionId: action.id,
      method: context.entry.method,
      path: context.entry.path,
      params: redact(context.args) as Record<string, unknown>,
      risk: 'write',
      confirmationTicket: issued.ticket,
      expiresAt: issued.expiresAt.toISOString(),
    });
    context.writer.write('done', { status: 'awaiting_confirmation' });
  }

  private requireTool(name: string | undefined, user: AuthenticatedUser): ToolCatalogEntry {
    if (name === undefined) {
      throw new AppError('AI_PROVIDER_ERROR');
    }
    const entry = this.tools.catalog.find(name, user.permissions);
    if (!entry) {
      throw new AppError('AUTH_FORBIDDEN');
    }
    return entry;
  }

  private parseArguments(raw: string): Record<string, unknown> {
    try {
      const value: unknown = JSON.parse(raw === '' ? '{}' : raw);
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('not an object');
      }
      return value as Record<string, unknown>;
    } catch {
      throw new AppError('AI_PROVIDER_ERROR');
    }
  }
}
