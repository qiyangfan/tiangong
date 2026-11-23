import { ElMessage } from 'element-plus';
import type { AiAction } from '@tiangong/contracts';
import {
  apiCancelAction,
  apiConfirmAction,
  apiCreateConversation,
  apiDeleteConversation,
} from '@/api/ai';
import { postSse, type SseEvent } from '@/utils/ai-stream';
import { confirmBox } from '@/utils/confirm';
import { localizedAiError } from './ai-errors';
import { summaryOf, type ChatContext, type PanelAction } from './ai-chat-state';

export interface ActionContext extends ChatContext {
  handleEvent: (event: SseEvent, index: number) => void;
  handleFailure: (error: unknown) => void;
}

interface StreamReplyInput {
  context: ActionContext;
  token: string;
  content: string;
  index: number;
}

async function streamReply(input: StreamReplyInput): Promise<void> {
  if (input.context.state.conversationId === null) {
    const conversation = await apiCreateConversation({});
    input.context.state.conversationId = conversation.id;
  }
  await postSse(
    `/ai/conversations/${input.context.state.conversationId}/messages`,
    {
      token: input.token,
      body: { content: input.content },
      signal: input.context.controller.current?.signal,
    },
    (event) => {
      input.context.handleEvent(event, input.index);
    },
  );
}

function createSendActions(context: ActionContext) {
  function beginSend(): { content: string; index: number } {
    const content = context.state.input.trim();
    context.state.input = '';
    context.state.errorText = '';
    context.state.sending = true;
    context.state.messages.push({ role: 'user', content });
    const index =
      context.state.messages.push({ role: 'assistant', content: '', pending: true }) - 1;
    context.controller.current = new AbortController();
    return { content, index };
  }

  function finishSend(index: number): void {
    context.state.sending = false;
    context.controller.current = null;
    const message = context.state.messages[index];
    if (message && message.content.trim() === '') {
      context.state.messages.splice(index, 1);
    } else if (message) {
      message.pending = false;
    }
    context.scroll();
  }

  async function send(): Promise<void> {
    const token = context.auth.accessToken;
    if (
      token === null ||
      context.state.disabled ||
      context.state.sending ||
      context.state.input.trim() === ''
    ) {
      return;
    }
    const started = beginSend();
    try {
      await streamReply({ context, token, content: started.content, index: started.index });
    } catch (error) {
      context.state.messages.splice(started.index, 1);
      context.handleFailure(error);
    } finally {
      finishSend(started.index);
    }
  }

  return { send };
}

function clearTicket(context: ActionContext, id: number): void {
  context.state.tickets = Object.fromEntries(
    Object.entries(context.state.tickets).filter(([key]) => Number(key) !== id),
  );
}

function createActionActions(context: ActionContext) {
  function canConfirm(action: PanelAction): boolean {
    return (
      action.status === 'awaiting_confirmation' &&
      action.busy !== true &&
      context.state.tickets[action.id] !== undefined &&
      context.auth.hasPermi('ai:confirm')
    );
  }

  function applyConfirmation(action: PanelAction, confirmed: AiAction): void {
    action.status = confirmed.status;
    action.errorCode = confirmed.errorCode;
    action.resultSummary = summaryOf(confirmed.result);
    clearTicket(context, action.id);
    if (confirmed.status === 'failed') {
      context.state.errorText = localizedAiError(context.t, confirmed.errorCode);
    }
  }

  async function confirmAction(action: PanelAction): Promise<void> {
    const ticket = context.state.tickets[action.id];
    if (ticket === undefined || action.busy === true || !canConfirm(action)) {
      return;
    }
    context.state.errorText = '';
    action.busy = true;
    try {
      applyConfirmation(action, await apiConfirmAction(action.id, ticket));
    } catch (error) {
      context.handleFailure(error);
    } finally {
      action.busy = false;
    }
  }

  return { canConfirm, confirmAction };
}

function createCancelAction(context: ActionContext) {
  async function cancelAction(action: PanelAction): Promise<void> {
    if (action.busy === true) {
      return;
    }
    context.state.errorText = '';
    action.busy = true;
    try {
      const cancelled = await apiCancelAction(action.id);
      action.status = cancelled.status;
      clearTicket(context, action.id);
    } catch (error) {
      context.handleFailure(error);
    } finally {
      action.busy = false;
    }
  }

  return { cancelAction };
}

function createSessionActions(context: ActionContext) {
  function resetConversation(): void {
    context.state.conversationId = null;
    context.state.messages = [];
    context.state.actions = [];
    context.state.tickets = {};
    context.state.errorText = '';
  }

  async function deleteCurrent(): Promise<void> {
    const id = context.state.conversationId;
    if (id === null) {
      return;
    }
    await apiDeleteConversation(id);
    resetConversation();
    ElMessage.success(context.t('common.opSuccess'));
  }

  async function removeConversation(): Promise<void> {
    if (
      context.state.conversationId === null ||
      context.state.sending ||
      context.state.actions.some((action) => action.busy === true)
    ) {
      return;
    }
    try {
      await confirmBox(context.t('ai.deleteConfirm'));
    } catch {
      return;
    }
    try {
      await deleteCurrent();
    } catch (error) {
      context.handleFailure(error);
    }
  }

  function close(): void {
    context.controller.current?.abort();
  }

  return { removeConversation, close };
}

/** 面板动作集合：发送、确认/取消与删除会话；失败统一交给事件层本地化。 */
export function createChatActions(context: ActionContext) {
  return {
    ...createSendActions(context),
    ...createActionActions(context),
    ...createCancelAction(context),
    ...createSessionActions(context),
  };
}
