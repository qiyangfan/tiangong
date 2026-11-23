import { describe, expect, it, vi } from 'vitest';
import { SseRequestError } from '@/utils/ai-stream';
import { createEventHandlers } from '../ai-chat-events';
import { createChatState, type ChatContext } from '../ai-chat-state';

function createContext(): ChatContext {
  return {
    state: createChatState(),
    t: (key: string) => key,
    auth: {
      accessToken: null,
      hasPermi: () => false,
      sessionExpired: vi.fn(() => Promise.resolve()),
    },
    scroll: vi.fn(),
    controller: { current: null },
  };
}

describe('AI 面板失败映射', () => {
  it('axios 风格的契约错误码使用 AI 本地化文案', () => {
    const context = createContext();

    createEventHandlers(context).handleFailure(
      Object.assign(new Error('server error'), { code: 'AI_CONFIRMATION_EXPIRED', status: 410 }),
    );

    expect(context.state.errorText).toBe('ai.error.confirmationExpired');
  });

  it('AI_DISABLED 同时置为禁用状态', () => {
    const context = createContext();

    createEventHandlers(context).handleFailure(
      Object.assign(new Error('disabled'), { code: 'AI_DISABLED', status: 503 }),
    );

    expect(context.state.disabled).toBe(true);
    expect(context.state.errorText).toBe('ai.error.disabled');
  });

  it('SSE 终局 401 交给会话清理，不覆盖为 AI 通用错误', () => {
    const context = createContext();

    createEventHandlers(context).handleFailure(
      new SseRequestError('AUTH_TOKEN_EXPIRED', 'expired', 401),
    );

    expect(context.auth.sessionExpired).toHaveBeenCalledWith('AUTH_TOKEN_EXPIRED');
    expect(context.state.errorText).toBe('');
  });
});
