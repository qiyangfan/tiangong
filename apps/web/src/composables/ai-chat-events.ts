import { SseRequestError, type SseEvent } from '@/utils/ai-stream';
import { localizedAiError } from './ai-errors';
import { recordOf, textOf, type ChatContext, type PanelAction } from './ai-chat-state';

function applyUpdate(action: PanelAction, next: Partial<PanelAction>): void {
  action.status = next.status ?? action.status;
  if (next.resultSummary !== undefined) {
    action.resultSummary = next.resultSummary;
  }
  if (next.errorCode !== undefined) {
    action.errorCode = next.errorCode;
  }
}

function upsertAction(context: ChatContext, next: PanelAction): PanelAction {
  const existing = context.state.actions.find((action) => action.id === next.id);
  if (existing) {
    applyUpdate(existing, next);
    return existing;
  }
  context.state.actions.push(next);
  return next;
}

function onDelta(context: ChatContext, data: Record<string, unknown>, index: number): void {
  const message = context.state.messages[index];
  if (message) {
    message.content += textOf(data['text']);
    message.pending = false;
  }
  context.scroll();
}

function onProposed(context: ChatContext, data: Record<string, unknown>): void {
  const id = data['actionId'];
  if (typeof id !== 'number') {
    return;
  }
  upsertAction(context, {
    id,
    method: textOf(data['method']),
    path: textOf(data['path']),
    params: recordOf(data['params']),
    risk: data['risk'] === 'read' ? 'read' : 'write',
    status: 'awaiting_confirmation',
  });
  const ticket = data['confirmationTicket'];
  if (typeof ticket === 'string') {
    context.state.tickets[id] = ticket;
  }
  context.scroll();
}

function onExecuted(context: ChatContext, data: Record<string, unknown>): void {
  const action = context.state.actions.find((item) => item.id === data['actionId']);
  if (action) {
    applyUpdate(action, { status: 'executed', resultSummary: textOf(data['resultSummary']) });
  }
}

function onFailed(context: ChatContext, data: Record<string, unknown>): void {
  const action = context.state.actions.find((item) => item.id === data['actionId']);
  const code = textOf(data['code']);
  if (action) {
    applyUpdate(action, { status: 'failed', errorCode: code });
    context.state.errorText = localizedAiError(context.t, action.errorCode);
    return;
  }
  context.state.errorText = localizedAiError(context.t, code);
}

function onError(context: ChatContext, data: Record<string, unknown>): void {
  context.state.errorText = localizedAiError(context.t, textOf(data['code']));
}

function parseData(context: ChatContext, event: SseEvent): Record<string, unknown> | undefined {
  try {
    return recordOf(JSON.parse(event.data));
  } catch {
    context.state.errorText = context.t('ai.error.generic');
    return undefined;
  }
}

interface DispatchInput {
  context: ChatContext;
  name: string;
  data: Record<string, unknown>;
  index: number;
}

function dispatch(input: DispatchInput): void {
  if (input.name === 'message.delta') {
    onDelta(input.context, input.data, input.index);
  } else if (input.name === 'action.proposed') {
    onProposed(input.context, input.data);
  } else if (input.name === 'action.executed') {
    onExecuted(input.context, input.data);
  } else if (input.name === 'action.failed') {
    onFailed(input.context, input.data);
  } else if (input.name === 'error') {
    onError(input.context, input.data);
  }
}

function handleEvent(context: ChatContext, event: SseEvent, index: number): void {
  const data = parseData(context, event);
  if (data) {
    dispatch({ context, name: event.event, data, index });
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function codeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function messageOf(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function applyCodedFailure(context: ChatContext, code: string, fallback?: string): void {
  if (code === 'AUTH_UNAUTHENTICATED' || code === 'AUTH_TOKEN_EXPIRED') {
    return;
  }
  if (code === 'AI_DISABLED') {
    context.state.disabled = true;
  }
  context.state.errorText = localizedAiError(context.t, code, fallback);
}

function handleSseFailure(context: ChatContext, error: SseRequestError): void {
  if (error.status === 401) {
    void context.auth.sessionExpired(error.code);
    return;
  }
  applyCodedFailure(context, error.code, error.message);
}

function handleFailure(context: ChatContext, error: unknown): void {
  if (isAbort(error)) {
    return;
  }
  if (error instanceof SseRequestError) {
    handleSseFailure(context, error);
    return;
  }
  const code = codeOf(error);
  if (code !== undefined) {
    applyCodedFailure(context, code, messageOf(error));
    return;
  }
  context.state.errorText = context.t('ai.error.generic');
}

export function createEventHandlers(context: ChatContext) {
  return {
    handleEvent: (event: SseEvent, index: number) => {
      handleEvent(context, event, index);
    },
    handleFailure: (error: unknown) => {
      handleFailure(context, error);
    },
  };
}
