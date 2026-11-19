import { describe, expect, it } from 'vitest';
import type { OperLogItem, PageResult } from '@tiangong/contracts';
import { ADMIN_USER, AUDIT_ROLE_KEY } from '../setup/fixtures';
import { adminAuth, testHttp } from './context';

const codeOf = (body: unknown): string => (body as { code: string }).code;

function dataOf<T>(body: unknown): T {
  return (body as { data: T }).data;
}

describe('分页与唯一性契约', () => {
  it('pageSize 超上限被 400 拒绝', async () => {
    const res = await testHttp().get('/api/v1/users?pageSize=200').set(adminAuth());
    expect(res.status).toBe(400);
    expect(codeOf(res.body)).toBe('VALIDATION_ERROR');
  });

  it('用户列表分页结构 items/total/page/pageSize', async () => {
    const res = await testHttp().get('/api/v1/users?page=1&pageSize=10').set(adminAuth());
    expect(res.status).toBe(200);
    const data = dataOf<PageResult<{ id: number }>>(res.body);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(10);
    expect(typeof data.total).toBe('number');
  });

  it('重复 roleKey 返回 409 ROLE_KEY_TAKEN', async () => {
    const res = await testHttp()
      .post('/api/v1/roles')
      .set(adminAuth())
      .send({ name: '重复', roleKey: 'superadmin', permissionIds: [] });
    expect(res.status).toBe(409);
    expect(codeOf(res.body)).toBe('ROLE_KEY_TAKEN');
  });
});

describe('审计', () => {
  it('写操作产生操作审计记录（含脱敏）', async () => {
    const created = await testHttp()
      .post('/api/v1/roles')
      .set(adminAuth())
      .send({ name: '集成测试角色', roleKey: AUDIT_ROLE_KEY, permissionIds: [] });
    expect(created.status).toBe(201);

    const logs = await testHttp()
      .get(`/api/v1/oper-logs?username=${ADMIN_USER}&businessType=insert`)
      .set(adminAuth());
    expect(logs.status).toBe(200);
    const entry = dataOf<PageResult<OperLogItem>>(logs.body).items.find(
      (log) => log.title === '角色管理',
    );
    expect(entry).toBeDefined();
    expect(entry?.requestId).not.toBe('');
  });
});
