import { Injectable } from '@nestjs/common';
import type { AiMessage as AiMessageRow } from '@prisma/client';
import type { AiConversation } from '@tiangong/contracts';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CONTEXT_CHAR_LIMIT,
  CONTEXT_MESSAGE_LIMIT,
  MESSAGE_CONTENT_LIMIT,
  TOOL_RESULT_LIMIT,
} from './ai.constants';
import { toAction, toConversation, toMessage } from './ai.mapper';
import type { AiProviderMessage } from './provider/ai-provider';
import { loadSystemPrompt } from './prompts/system-prompt';
import { truncateText } from './redaction';
import { AiSettingsService } from './ai-settings.service';
import { ToolCatalogService } from './tools/tool-catalog.service';

export interface PreparedMessage {
  conversationId: number;
  messages: AiMessageRow[];
}

/** 会话读写与模型上下文窗口；SSE 开始前的用户消息落库也在这里。 */
@Injectable()
export class AiConversationService {
  constructor(
    private readonly settings: AiSettingsService,
    private readonly prisma: PrismaService,
    private readonly catalog: ToolCatalogService,
  ) {}

  async create(userId: number, title?: string): Promise<AiConversation> {
    this.settings.assertEnabled();
    const row = await this.prisma.aiConversation.create({
      data: { userId, title: title?.trim() || '新会话' },
    });
    return toConversation(row);
  }

  async get(id: number, userId: number) {
    this.settings.assertEnabled();
    const row = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        actions: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!row) {
      throw new AppError('AI_SESSION_NOT_FOUND');
    }
    return {
      conversation: toConversation(row),
      messages: row.messages.map(toMessage),
      actions: row.actions.map(toAction),
    };
  }

  async delete(id: number, userId: number): Promise<void> {
    this.settings.assertEnabled();
    const deleted = await this.prisma.aiConversation.deleteMany({ where: { id, userId } });
    if (deleted.count !== 1) {
      throw new AppError('AI_SESSION_NOT_FOUND');
    }
  }

  /** SSE 开始前的全部校验与用户消息落库；此后错误只能走流内 error 事件。 */
  async prepare(conversationId: number, userId: number, content: string): Promise<PreparedMessage> {
    this.settings.assertEnabled();
    this.assertCatalogReady();
    const conversation = await this.owned(conversationId, userId);
    await this.append(conversationId, 'user', content);
    await this.retitle(conversation.id, conversation.title, content);
    return { conversationId, messages: await this.recent(conversationId) };
  }

  async append(
    conversationId: number,
    role: 'user' | 'assistant' | 'tool',
    content: string,
  ): Promise<void> {
    const trimmed = truncateText(content, MESSAGE_CONTENT_LIMIT);
    await this.prisma.$transaction([
      this.prisma.aiMessage.create({ data: { conversationId, role, content: trimmed } }),
      this.prisma.aiConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }

  systemMessage(): AiProviderMessage {
    return { role: 'system', content: loadSystemPrompt() };
  }

  /** 只把最近 20 条 / 32k 字符带进模型；tool 消息按 assistant 文本回放，避免伪造 tool_call_id。 */
  history(messages: AiMessageRow[]): AiProviderMessage[] {
    const selected: AiProviderMessage[] = [];
    this.fillWindow(messages, selected);
    return selected.toReversed();
  }

  private fillWindow(messages: AiMessageRow[], selected: AiProviderMessage[]): void {
    let chars = 0;
    for (const message of messages.toReversed()) {
      const entry = this.windowEntry(message, chars, selected.length);
      if (!entry) {
        return;
      }
      selected.push(entry.message);
      chars += entry.chars;
    }
  }

  private windowEntry(
    row: AiMessageRow,
    usedChars: number,
    count: number,
  ): { message: AiProviderMessage; chars: number } | undefined {
    if (count >= CONTEXT_MESSAGE_LIMIT) {
      return undefined;
    }
    const content = truncateText(row.content, TOOL_RESULT_LIMIT);
    if (usedChars + content.length > CONTEXT_CHAR_LIMIT && count > 0) {
      return undefined;
    }
    return { message: this.providerMessage(row, content), chars: content.length };
  }

  private providerMessage(row: AiMessageRow, content: string): AiProviderMessage {
    if (row.role === 'tool') {
      return { role: 'assistant', content: `Tool result:\n${content}` };
    }
    if (row.role === 'assistant') {
      return { role: 'assistant', content };
    }
    return { role: 'user', content };
  }

  private assertCatalogReady(): void {
    if (!this.catalog.isInitialized()) {
      throw new AppError('INTERNAL_ERROR', 'AI tool catalog is not initialized');
    }
  }

  private async owned(id: number, userId: number) {
    const conversation = await this.prisma.aiConversation.findFirst({ where: { id, userId } });
    if (!conversation) {
      throw new AppError('AI_SESSION_NOT_FOUND');
    }
    return conversation;
  }

  private async retitle(id: number, title: string, content: string): Promise<void> {
    if (title !== '新会话') {
      return;
    }
    await this.prisma.aiConversation.update({
      where: { id },
      data: { title: content.slice(0, 30) || '新会话' },
    });
  }

  private async recent(conversationId: number): Promise<AiMessageRow[]> {
    const rows = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: CONTEXT_MESSAGE_LIMIT,
    });
    return rows.toReversed();
  }
}
