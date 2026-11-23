import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminAuth, prisma, testHttp } from './context';
import {
  cleanupAi,
  confirmAction,
  confirmAndExpect,
  conversationDetail,
  createConversation,
  expectReadDetail,
  expectReadEvents,
  proposeAction,
  sampleUser,
  sendMessage,
  setupAi,
  tokenOf,
  waitForAudit,
} from './support/ai';

beforeAll(setupAi);
afterAll(cleanupAi);

describe('AI 会话与 SSE', () => {
  it('状态与只读 SSE：action.executed 后 done 收口，不产生草案', async () => {
    const status = await testHttp().get('/api/v1/ai/status').set(adminAuth());
    expect(status.status).toBe(200);
    expect((status.body as { data: { enabled: boolean } }).data.enabled).toBe(true);

    const token = sampleUser();
    const conversationId = await createConversation(token);
    const events = await sendMessage({ token, conversationId, content: '查询示例数据' });
    expectReadEvents(events);

    const detail = await conversationDetail(token, conversationId);
    expectReadDetail(detail);
  });

  it('写草案的 assistant 文本只落库一次', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    await proposeAction({
      token,
      conversationId,
      content: '创建示例数据，名称:IT-AI-文本草案 __write_text__',
    });

    const detail = await conversationDetail(token, conversationId);
    expect(
      detail.messages.filter(
        (message) => message.role === 'assistant' && message.content === '准备创建。',
      ),
    ).toHaveLength(1);
  });
});

describe('AI 确认票据', () => {
  it('写操作缺票据 409、错误票据 410，读取会话不泄露票据', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    const { actionId, ticket } = await proposeAction({
      token,
      conversationId,
      content: '创建示例数据，名称:IT-AI-票据',
    });
    expect(JSON.stringify(await conversationDetail(token, conversationId))).not.toContain(ticket);

    const missing = await confirmAction(token, actionId);
    expect(missing.status).toBe(409);
    expect((missing.body as { code: string }).code).toBe('AI_CONFIRMATION_REQUIRED');

    const wrong = await confirmAction(token, actionId, 'not-a-ticket');
    expect(wrong.status).toBe(410);
    expect((wrong.body as { code: string }).code).toBe('AI_CONFIRMATION_EXPIRED');
  });

  it('正确票据执行一次且审计可通过 requestId 关联', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    const name = `IT-AI-${Date.now()}`;
    const { actionId, ticket } = await proposeAction({
      token,
      conversationId,
      content: `创建示例数据，名称:${name}`,
    });
    const action = await confirmAndExpect(token, actionId, ticket);
    expect(await prisma.sampleRecord.count({ where: { name } })).toBe(1);

    const audit = await waitForAudit(action.requestId ?? '');
    expect(audit?.requestPath).toBe('/api/v1/samples');
    expect(audit?.requestId).toBe(action.requestId);
  });
});

describe('AI 幂等与并发', () => {
  it('重复确认返回既有结果，不产生第二条记录', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    const name = `IT-AI-幂等-${Date.now()}`;
    const { actionId, ticket } = await proposeAction({
      token,
      conversationId,
      content: `创建示例数据，名称:${name}`,
    });
    await confirmAndExpect(token, actionId, ticket);
    const repeated = await confirmAction(token, actionId, ticket);
    expect(repeated.status).toBe(200);
    expect((repeated.body as { data: { status: string } }).data.status).toBe('executed');
    expect(await prisma.sampleRecord.count({ where: { name } })).toBe(1);
  });

  it('并发确认只有一个副作用', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    const name = `IT-AI-并发-${Date.now()}`;
    const { actionId, ticket } = await proposeAction({
      token,
      conversationId,
      content: `创建示例数据，名称:${name}`,
    });
    const [first, second] = await Promise.all([
      confirmAction(token, actionId, ticket),
      confirmAction(token, actionId, ticket),
    ]);
    expect([first.status, second.status].filter((status) => status === 200)).toHaveLength(1);
    expect([first.status, second.status].every((status) => [200, 409].includes(status))).toBe(true);
    expect(await prisma.sampleRecord.count({ where: { name } })).toBe(1);
  });
});

describe('AI 票据失效与取消', () => {
  it('票据过期与他人票据被拒', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    const expired = await proposeAction({
      token,
      conversationId,
      content: '创建示例数据，名称:IT-AI-过期',
    });
    await prisma.aiConfirmation.update({
      where: { actionId: expired.actionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await confirmAction(token, expired.actionId, expired.ticket)).status).toBe(410);

    const other = await confirmAction(tokenOf('it_ai_other'), expired.actionId, expired.ticket);
    expect(other.status).toBe(404);
    expect((other.body as { code: string }).code).toBe('AI_ACTION_NOT_FOUND');
  });

  it('取消后动作不可执行', async () => {
    const token = sampleUser();
    const conversationId = await createConversation(token);
    const cancelled = await proposeAction({
      token,
      conversationId,
      content: '创建示例数据，名称:IT-AI-取消',
    });
    const cancelRes = await testHttp()
      .post(`/api/v1/ai/actions/${cancelled.actionId}/cancel`)
      .set({ Authorization: `Bearer ${token}` });
    expect(cancelRes.status).toBe(200);
    expect((cancelRes.body as { data: { status: string } }).data.status).toBe('cancelled');
    expect((await confirmAction(token, cancelled.actionId, cancelled.ticket)).status).toBe(409);
  });
});
