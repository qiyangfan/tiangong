import { AppError } from '../../../common/app-error';
import type { AiProvider, AiProviderMessage, AiToolDefinition, ProviderDelta } from './ai-provider';

export interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
}

interface StreamChoiceDelta {
  content?: unknown;
  tool_calls?: Array<{
    index?: unknown;
    id?: unknown;
    function?: { name?: unknown; arguments?: unknown };
  }>;
}

interface StreamPayload {
  choices?: Array<{ delta?: StreamChoiceDelta; finish_reason?: unknown }>;
  error?: { message?: unknown };
}

interface ChatInput {
  messages: AiProviderMessage[];
  tools: AiToolDefinition[];
  signal: AbortSignal;
}

interface StreamState {
  buffer: string;
}

function trimTrailingSlashes(value: string): string {
  let result = value;
  while (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

function endpointOf(baseUrl: string): string {
  const trimmed = trimTrailingSlashes(baseUrl);
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** OpenAI-compatible Chat Completions 流式适配器；零 SDK 依赖，错误统一收敛为 AI_PROVIDER_ERROR。 */
export class OpenAiCompatibleProvider implements AiProvider {
  constructor(private readonly config: OpenAiCompatibleConfig) {}

  async *chat(input: ChatInput): AsyncIterable<ProviderDelta> {
    const timeoutSignal = AbortSignal.timeout(this.config.timeoutMs);
    const signal = AbortSignal.any([input.signal, timeoutSignal]);
    const body = await this.request(input, signal);
    yield* this.readStream(body, input.signal);
  }

  private async request(
    input: ChatInput,
    signal: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    try {
      const response = await fetch(endpointOf(this.config.baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.requestBody(input)),
        signal,
        redirect: 'error',
      });
      if (!response.ok || response.body === null) {
        throw new AppError('AI_PROVIDER_ERROR');
      }
      return response.body;
    } catch (error) {
      if (input.signal.aborted) {
        throw error;
      }
      throw new AppError('AI_PROVIDER_ERROR');
    }
  }

  private requestBody(input: ChatInput): Record<string, unknown> {
    return {
      model: this.config.model,
      messages: input.messages,
      max_tokens: this.config.maxTokens,
      stream: true,
      ...(input.tools.length > 0
        ? { tools: input.tools, tool_choice: 'auto', parallel_tool_calls: false }
        : {}),
    };
  }

  private async *readStream(
    body: ReadableStream<Uint8Array>,
    callerSignal: AbortSignal,
  ): AsyncGenerator<ProviderDelta> {
    const decoder = new TextDecoder();
    const state: StreamState = { buffer: '' };
    for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
      state.buffer += decoder.decode(chunk, { stream: true });
      yield* this.drainLines(state, callerSignal);
    }
    state.buffer += decoder.decode();
    if (state.buffer.trim() !== '') {
      yield* this.parseLine(state.buffer.replace(/\r$/, ''), callerSignal);
    }
  }

  private *drainLines(state: StreamState, callerSignal: AbortSignal): Generator<ProviderDelta> {
    let lineEnd = state.buffer.indexOf('\n');
    while (lineEnd >= 0) {
      const line = state.buffer.slice(0, lineEnd).replace(/\r$/, '');
      state.buffer = state.buffer.slice(lineEnd + 1);
      yield* this.parseLine(line, callerSignal);
      lineEnd = state.buffer.indexOf('\n');
    }
  }

  private *parseLine(line: string, callerSignal: AbortSignal): Generator<ProviderDelta> {
    if (callerSignal.aborted) {
      throw callerSignal.reason;
    }
    const data = this.payloadOf(line);
    if (data === undefined) {
      return;
    }
    yield* this.parsePayloadDeltas(this.parsePayload(data));
  }

  private payloadOf(line: string): string | undefined {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith(':') || !trimmed.startsWith('data:')) {
      return undefined;
    }
    const data = trimmed.slice('data:'.length).trim();
    return data === '[DONE]' ? undefined : data;
  }

  private parsePayload(data: string): StreamPayload {
    try {
      const payload = JSON.parse(data) as StreamPayload;
      if (payload.error !== undefined) {
        throw new AppError('AI_PROVIDER_ERROR');
      }
      return payload;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('AI_PROVIDER_ERROR');
    }
  }

  private *parsePayloadDeltas(payload: StreamPayload): Generator<ProviderDelta> {
    const choice = payload.choices?.[0];
    if (!choice) {
      return;
    }
    if (choice.finish_reason === 'length') {
      throw new AppError('AI_PROVIDER_ERROR');
    }
    const content = choice.delta?.content;
    if (typeof content === 'string' && content !== '') {
      yield { type: 'text', text: content };
    }
    yield* this.toolDeltas(choice.delta?.tool_calls ?? []);
  }

  private *toolDeltas(
    calls: NonNullable<StreamChoiceDelta['tool_calls']>,
  ): Generator<ProviderDelta> {
    for (const raw of calls) {
      const id = asString(raw.id);
      const name = asString(raw.function?.name);
      yield {
        type: 'tool_call',
        index: typeof raw.index === 'number' ? raw.index : 0,
        ...(id === undefined ? {} : { id }),
        ...(name === undefined ? {} : { name }),
        argumentsDelta: asString(raw.function?.arguments) ?? '',
      };
    }
  }
}
