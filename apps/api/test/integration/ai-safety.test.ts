import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminAuth, prisma, testHttp } from './context';
import { bearer } from '../setup/app';
import {
  apiBaseUrl,
  cleanupAi,
  confirmAction,
  conversationDetail,
  createConversation,
  expectDone,
  INJECTION_NAME,
  otherUser,
  proposeAction,
  rateUser,
  revokeSampleCreate,
  revokeUser,
  sampleUser,
  sendMessage,
  setupAi,
  withAiDisabled,
} from './support/ai';

beforeAll(setupAi);
afterAll(cleanupAi);

describe('AI 安全与失败语义', () => {
  it('权限撤销后确认被拒且动作失败', async () => {
    const token = revokeUser();
    const conversationId = await createConversation(token);
    const { actionId, ticket } = await proposeAction({
      token,
      conversationId,
      content: '创建示例数据，名称:IT-AI-撤权',
    });
    await revokeSampleCreate();
    const res = await confirmAction(token, actionId, ticket);
    expect(res.status).toBe(403);
    expect((res.body as { code: string }).code).toBe('AUTH_FORBIDDEN');
    const detail = await conversationDetail(token, conversationId);
    expect(detail.actions.find((item) => item.id === actionId)?.status).toBe('failed');
  });

  it('零业务权限时模型看不到写工具；工具结果中的指令不被执行', async () => {
    const token = otherUser();
    const conversationId = await createConversation(token);
    const events = await sendMessage({ token, conversationId, content: '删除示例 ID:1' });
    expect(events.some((event) => event.event === 'action.proposed')).toBe(false);
    expectDone(events, 'completed');
    expect((await conversationDetail(token, conversationId)).actions).toEqual([]);
    expect(await prisma.sampleRecord.count({ where: { name: INJECTION_NAME } })).toBe(1);
  });
});

describe('AI 失败收口与关闭', () => {
  it('provider 超时与工具循环超限以稳定错误码收口', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    const timeout = await sendMessage({ token, conversationId, content: '__timeout__' });
    expect(timeout.find((event) => event.event === 'error')?.data['code']).toBe(
      'AI_PROVIDER_ERROR',
    );
    expectDone(timeout, 'failed');

    const loop = await sendMessage({ token, conversationId, content: '__loop__' });
    expect(loop.find((event) => event.event === 'error')?.data['code']).toBe('AI_TOOL_LOOP_LIMIT');
    expectDone(loop, 'failed');
  });

  it('AI_DISABLED 关闭入口且人工路径不受影响', async () => {
    await withAiDisabled(async () => {
      const status = await testHttp().get('/api/v1/ai/status').set(adminAuth());
      expect((status.body as { data: { enabled: boolean } }).data.enabled).toBe(false);
      const res = await testHttp()
        .post('/api/v1/ai/conversations')
        .set(bearer(sampleUser()))
        .send({});
      expect(res.status).toBe(503);
      expect((res.body as { code: string }).code).toBe('AI_DISABLED');
      expect((await testHttp().get('/api/v1/samples').set(adminAuth())).status).toBe(200);
    });
  });
});

describe('AI 数据清理与限流', () => {
  it('他人不能删除会话', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    await sendMessage({ token, conversationId, content: '查询示例数据' });
    const otherDelete = await testHttp()
      .delete(`/api/v1/ai/conversations/${conversationId}`)
      .set(bearer(otherUser()));
    expect(otherDelete.status).toBe(404);
  });

  it('删除会话级联清理', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    await sendMessage({ token, conversationId, content: '查询示例数据' });
    const res = await testHttp()
      .delete(`/api/v1/ai/conversations/${conversationId}`)
      .set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 0, data: null });
    const read = await testHttp()
      .get(`/api/v1/ai/conversations/${conversationId}`)
      .set(bearer(token));
    expect(read.status).toBe(404);
    expect(await prisma.aiMessage.count({ where: { conversationId } })).toBe(0);
    expect(await prisma.aiAction.count({ where: { conversationId } })).toBe(0);
  });

  it('消息端点按用户限流', async () => {
    const token = rateUser();
    const conversationId = await createConversation(token);
    for (let i = 0; i < 10; i += 1) {
      expectDone(await sendMessage({ token, conversationId, content: '你好' }), 'completed');
    }
    const res = await fetch(`${apiBaseUrl()}/api/v1/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '你好' }),
    });
    expect(res.status).toBe(429);
    expect((await res.json()) as { code: string }).toMatchObject({ code: 'AUTH_RATE_LIMITED' });
  });
});
