import { describe, expect, it } from 'vitest';
import type { SampleRecordItem } from '@tiangong/contracts';
import { loginAdmin } from '../setup/app';
import { SAMPLE_CREATE_BODY, SAMPLE_SEED, SAMPLE_UX_SEED } from '../setup/fixtures';
import { adminAuth, nopermAuth, testHttp } from './context';

const codeOf = (body: unknown): string => (body as { code: string }).code;

const dataOf = <T>(body: unknown): T => (body as { data: T }).data;

/** miniapp 客户端会话：refresh 走 body、client=miniapp，读写同一条记录。 */
async function miniAuth(): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await loginAdmin(testHttp())}` };
}

async function updateViaMiniapp(id: number, name: string): Promise<void> {
  const res = await testHttp()
    .put(`/api/v1/samples/${id}`)
    .set(await miniAuth())
    .send({ name, amount: '99.99' });
  expect(res.status).toBe(200);
  expect(dataOf<SampleRecordItem>(res.body).amount).toBe('99.99');
}

function createSample(name: string, extra: Partial<SampleRecordItem> = {}) {
  return testHttp()
    .post('/api/v1/samples')
    .set(adminAuth())
    .send({ ...SAMPLE_CREATE_BODY, ...extra, name });
}

async function createSampleOk(name: string): Promise<SampleRecordItem> {
  const res = await createSample(name);
  expect(res.status).toBe(201);
  return dataOf<SampleRecordItem>(res.body);
}

describe('SampleRecord 跨端闭环', () => {
  it('web 建档 → miniapp 读取同一条记录', async () => {
    const created = await createSampleOk(`${SAMPLE_UX_SEED}跨端样例`);
    expect(created.amount).toBe(SAMPLE_CREATE_BODY.amount);

    const miniRead = await testHttp()
      .get(`/api/v1/samples/${created.id}`)
      .set(await miniAuth());
    expect(miniRead.status).toBe(200);
    expect(dataOf<SampleRecordItem>(miniRead.body).name).toBe(created.name);
  });

  it('miniapp 修改 → web 按关键词可见修改后的记录', async () => {
    const created = await createSampleOk(`${SAMPLE_UX_SEED}跨端样例`);
    const edited = `${created.name}-小程序改`;
    await updateViaMiniapp(created.id, edited);
    const webRead = await testHttp().get('/api/v1/samples?keyword=小程序改').set(adminAuth());
    const page = dataOf<{ total: number; items: SampleRecordItem[] }>(webRead.body);
    expect(page.total).toBe(1);
    expect(page.items[0]?.name).toBe(edited);

    const del = await testHttp().delete(`/api/v1/samples/${created.id}`).set(adminAuth());
    expect(del.status).toBe(200);
  });

  it('无权限用户写被拒（默认拒绝）', async () => {
    const denied = await testHttp()
      .post('/api/v1/samples')
      .set(nopermAuth())
      .send({ name: `${SAMPLE_UX_SEED}越权样例` });
    expect(denied.status).toBe(403);
    expect(codeOf(denied.body)).toBe('AUTH_FORBIDDEN');
  });
});

describe('SampleRecord 小程序原生方法', () => {
  it('miniapp 原生 PUT 更新同一条记录（微信 request 合法 method）', async () => {
    const created = await createSampleOk(`${SAMPLE_SEED}put样例`);
    const updated = await testHttp()
      .put(`/api/v1/samples/${created.id}`)
      .set(await miniAuth())
      .send({ name: `${created.name}-已改` });
    expect(updated.status).toBe(200);
    expect(dataOf<SampleRecordItem>(updated.body).name).toBe(`${created.name}-已改`);

    await testHttp().delete(`/api/v1/samples/${created.id}`).set(adminAuth());
  });
});

describe('SampleRecord 输入校验', () => {
  it('金额非法字符串与超长名称被 400 拒绝', async () => {
    const bad = await createSample(`${SAMPLE_SEED}金额非法`, { amount: '1.234' });
    expect(bad.status).toBe(400);
    expect(codeOf(bad.body)).toBe('VALIDATION_ERROR');

    const missing = await testHttp()
      .post('/api/v1/samples')
      .set(adminAuth())
      .send({ category: 'a' });
    expect(missing.status).toBe(400);
    expect(codeOf(missing.body)).toBe('VALIDATION_ERROR');
  });
});
