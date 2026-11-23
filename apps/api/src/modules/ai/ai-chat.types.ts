import type { Response } from 'express';
import type { AuthenticatedUser } from '../../security/current-user.decorator';
import type { PreparedMessage } from './ai-conversation.service';
import type { AiProviderMessage } from './provider/ai-provider';
import type { SseWriter } from './sse';

export interface RunMessageOptions {
  res: Response;
  token: string;
  user: AuthenticatedUser;
  signal: AbortSignal;
}

export interface ToolCallAccumulator {
  id?: string;
  name?: string;
  arguments: string;
}

interface LoopState {
  rounds: number;
  toolCalls: number;
}

export interface ChatContext {
  prepared: PreparedMessage;
  options: RunMessageOptions;
  writer: SseWriter;
  extra: AiProviderMessage[];
  state: LoopState;
}

export interface CallContext extends ChatContext {
  call: ToolCallAccumulator;
  assistantText: string;
}

export interface ReadContext extends CallContext {
  entry: import('./tools/tool-catalog.service').ToolCatalogEntry;
  args: Record<string, unknown>;
}

export interface WriteContext extends CallContext {
  entry: import('./tools/tool-catalog.service').ToolCatalogEntry;
  args: Record<string, unknown>;
}
