import type { AiAction } from '@tiangong/contracts';
import { describe, expect, it, vi } from 'vitest';
import { createChatActions, type ActionContext } from '../ai-chat-actions';
import { createChatState, type PanelAction } from '../ai-chat-state';

const api = vi.hoisted(() => ({
  confirm: vi.fn(),
  cancel: vi.fn(),
  deleteConversation: vi.fn(),
  createConversation: vi.fn(),
}));

vi.mock('@/api/ai', () => ({
  apiConfirmAction: api.confirm,
  apiCancelAction: api.cancel,
  apiDeleteConversation: api.deleteConversation,
  apiCreateConversation: api.createConversation,
}));
vi.mock('@/utils/confirm', () => ({ confirmBox: vi.fn() }));
vi.mock('@/utils/ai-stream', () => ({ postSse: vi.fn() }));
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }));

function createContext(): ActionContext {
  return {
    state: createChatState(),
    t: (key: string) => key,
    auth: {
      accessToken: 'access-token',
      hasPermi: () => true,
      sessionExpired: vi.fn(() => Promise.resolve()),
    },
    scroll: vi.fn(),
    controller: { current: null },
    handleEvent: vi.fn(),
    handleFailure: vi.fn(),
  };
}

function awaitingAction(): AiAction {
  return {
    id: 1,
    conversationId: 1,
    toolName: 'post_samples',
    method: 'POST',
    path: '/samples',
    params: { name: 'demo' },
    risk: 'write',
    status: 'awaiting_confirmation',
    requestId: null,
    errorCode: null,
    result: null,
    createdAt: '2026-11-23T00:00:00.000Z',
    updatedAt: '2026-11-23T00:00:00.000Z',
  };
}

describe('AI 面板动作状态', () => {
  it('确认开始前清理上一条错误，成功后展示新状态', async () => {
    const context = createContext();
    const action = awaitingAction();
    const pending: PanelAction = {
      id: action.id,
      method: action.method,
      path: action.path,
      params: action.params,
      risk: action.risk,
      status: action.status,
    };
    context.state.errorText = 'old error';
    context.state.actions.push(pending);
    context.state.tickets[action.id] = 'ticket';
    api.confirm.mockResolvedValue({ ...action, status: 'executed' });

    await createChatActions(context).confirmAction(pending);

    expect(context.state.errorText).toBe('');
    expect(context.state.actions[0]?.status).toBe('executed');
  });
});
