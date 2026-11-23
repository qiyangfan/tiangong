import { Inject, Injectable, Logger } from '@nestjs/common';
import { errorMeta } from '@tiangong/contracts';
import { AppError } from '../../common/app-error';
import { getRequestId } from '../../common/request-context';
import { MAX_MODEL_ROUNDS, MAX_TOOL_CALLS } from './ai.constants';
import { AiChatToolService } from './ai-chat-tool.service';
import type { ChatContext, RunMessageOptions, ToolCallAccumulator } from './ai-chat.types';
import type { PreparedMessage } from './ai-conversation.service';
import { AiServices } from './ai-runtime';
import type { AiProvider } from './provider/ai-provider';
import { AI_PROVIDER } from './provider/ai-provider';
import { SseWriter } from './sse';

interface RoundResult {
  assistantText: string;
  call?: ToolCallAccumulator | undefined;
}

/** 对话循环与流式输出：模型往返与工具调用均有上限，错误只走流内事件。 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly services: AiServices,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly toolCalls: AiChatToolService,
  ) {}

  async runMessage(prepared: PreparedMessage, options: RunMessageOptions): Promise<void> {
    const writer = new SseWriter(options.res);
    writer.start();
    const context: ChatContext = {
      prepared,
      options,
      writer,
      extra: [],
      state: { rounds: 0, toolCalls: 0 },
    };
    try {
      await this.loop(context);
    } catch (error) {
      this.failStream(context, error);
    } finally {
      writer.end();
    }
  }

  private async loop(context: ChatContext): Promise<void> {
    while (!context.options.signal.aborted) {
      if (await this.nextRound(context)) {
        return;
      }
    }
  }

  private async nextRound(context: ChatContext): Promise<boolean> {
    context.state.rounds += 1;
    this.assertBudget(context.state.rounds, MAX_MODEL_ROUNDS);
    const round = await this.runRound(context);
    if (round.call === undefined) {
      await this.complete(round.assistantText, context);
      return true;
    }
    context.state.toolCalls += 1;
    this.assertBudget(context.state.toolCalls, MAX_TOOL_CALLS);
    return this.toolCalls.handle({
      ...context,
      call: round.call,
      assistantText: round.assistantText,
    });
  }

  private assertBudget(value: number, max: number): void {
    if (value > max) {
      throw new AppError('AI_TOOL_LOOP_LIMIT');
    }
  }

  private async runRound(context: ChatContext): Promise<RoundResult> {
    const messages = [
      this.services.conversations.systemMessage(),
      ...this.services.conversations.history(context.prepared.messages),
      ...context.extra,
    ];
    const tools = this.toolCalls.definitions(context.options.user.permissions);
    const accumulator = new Map<number, ToolCallAccumulator>();
    let assistantText = '';
    for await (const delta of this.provider.chat({
      messages,
      tools,
      signal: context.options.signal,
    })) {
      if (delta.type === 'text') {
        assistantText += delta.text;
        context.writer.write('message.delta', { text: delta.text });
      } else {
        this.accumulate(accumulator, delta);
      }
    }
    return { assistantText, call: this.singleCall(accumulator) };
  }

  private accumulate(
    accumulator: Map<number, ToolCallAccumulator>,
    delta: {
      index: number;
      id?: string | undefined;
      name?: string | undefined;
      argumentsDelta: string;
    },
  ): void {
    const entry = accumulator.get(delta.index) ?? { arguments: '' };
    if (delta.id !== undefined) {
      entry.id = delta.id;
    }
    if (delta.name !== undefined) {
      entry.name = delta.name;
    }
    entry.arguments += delta.argumentsDelta;
    accumulator.set(delta.index, entry);
  }

  private singleCall(
    accumulator: Map<number, ToolCallAccumulator>,
  ): ToolCallAccumulator | undefined {
    if (accumulator.size > 1) {
      throw new AppError('AI_PROVIDER_ERROR');
    }
    return accumulator.size === 1 ? [...accumulator.values()][0] : undefined;
  }

  private async complete(assistantText: string, context: ChatContext): Promise<void> {
    if (assistantText.trim() === '') {
      throw new AppError('AI_PROVIDER_ERROR');
    }
    await this.services.conversations.append(
      context.prepared.conversationId,
      'assistant',
      assistantText,
    );
    context.writer.write('done', { status: 'completed' });
  }

  private failStream(context: ChatContext, error: unknown): void {
    if (context.options.signal.aborted) {
      return;
    }
    const code = error instanceof AppError ? error.code : 'AI_PROVIDER_ERROR';
    this.logger.warn(
      `ai stream failed conversation=${context.prepared.conversationId} requestId=${getRequestId()} code=${code}`,
    );
    context.writer.write('error', { code, message: errorMeta(code).message });
    context.writer.write('done', { status: 'failed' });
  }
}
