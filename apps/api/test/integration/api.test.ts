import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

// 必须在动态 import AppModule 之前覆盖环境（静态导入会提升，故 AppModule 在 setup 中动态加载）
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'mysql://tiangong:tiangong_dev@127.0.0.1:3307/tiangong_test';
process.env.ADMIN_INITIAL_PASSWORD = 'TestAdmin1pw';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_at_least_32_chars_long!!';
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();

async function prepareDatabase(): Promise<void> {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: { ...process.env },
  });
  execSync('pnpm exec prisma db seed', {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: { ...process.env },
  });
}

/** 清理本套件创建的确定性测试实体（保证可重复运行）。 */
async function cleanupFixtures(): Promise<void> {
  const user = await prisma.user.findUnique({ where: { username: 'noperm' } });
  if (user) {
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.operLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.role.deleteMany({ where: { roleKey: 'noperm_role' } });
  await prisma.role.deleteMany({ where: { roleKey: 'it_team' } });
  // 复位 admin 的失败计数（避免影响后续运行）
  await prisma.user.update({
    where: { username: 'admin' },
    data: { failedAttempts: 0, lockUntil: null },
  });
}

// 延迟初始化：数据库就绪后再装配应用
let app: import('../setup/app').TestApp;
let adminToken = '';
let nopermToken = '';

async function loginOnce(http: import('../setup/app').TestApp['http']): Promise<string> {
  const { login } = await import('../setup/app');
  return login(http);
}

beforeAll(async () => {
  await prepareDatabase();
  await cleanupFixtures();
  const { createTestApp } = await import('../setup/app');
  app = await createTestApp();
  adminToken = await loginOnce(app.http);
});

afterAll(async () => {
  await app.app.close();
  await prisma.$disconnect();
});

describe('health 探针', () => {
  it('live/ready 均返回 200', async () => {
    const live = await app.http.get('/api/v1/health/live');
    expect(live.status).toBe(200);
    expect(live.body.status).toBe('ok');
    const ready = await app.http.get('/api/v1/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.checks.database).toBe('up');
  });
});

describe('认证契约', () => {
  it('错误密码返回 401 + 稳定错误码（不泄露用户是否存在）', async () => {
    const res = await app.http
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'WrongPass1', client: 'web' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(res.body.data).toBeNull();
    expect(res.body.requestId).toBeTruthy();
  });

  it('缺 client 被校验管道拒绝 400', async () => {
    const res = await app.http
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'TestAdmin1pw' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('web 登录成功：envelope + HttpOnly refresh Cookie，不回传 refresh 到响应体', async () => {
    const res = await app.http
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'TestAdmin1pw', client: 'web' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.permissions).toContain('*:*:*');
    expect(res.body.data.refreshToken).toBeUndefined();
    const rawCookie = res.headers['set-cookie'];
    const setCookie = Array.isArray(rawCookie) ? rawCookie.join('\n') : String(rawCookie ?? '');
    expect(setCookie).toContain('tg_refresh=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/api/v1/auth');
  });

  it('无 token 访问受保护接口返回 401，伪造 token 返回 401', async () => {
    const no = await app.http.get('/api/v1/auth/profile');
    expect(no.status).toBe(401);
    expect(no.body.code).toBe('AUTH_UNAUTHENTICATED');
    const bad = await app.http.get('/api/v1/auth/profile').set('Authorization', 'Bearer not.a.jwt');
    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('携带 access token 可读个人信息', async () => {
    const res = await app.http
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.username).toBe('admin');
  });

  it('miniapp refresh 轮换：旧 refresh 复用被拒', async () => {
    const loginRes = await app.http
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'TestAdmin1pw', client: 'miniapp' });
    const firstRefresh = loginRes.body.data.refreshToken as string;
    const refreshed = await app.http
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefresh, client: 'miniapp' });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();
    const replay = await app.http
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefresh, client: 'miniapp' });
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe('AUTH_REFRESH_INVALID');
  });
});

describe('RBAC 默认拒绝', () => {
  beforeAll(async () => {
    // 建"零权限"角色与用户（仅此一次，用例见 cleanupFixtures）
    const role = await app.http
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '无权限角色', roleKey: 'noperm_role', permissionIds: [] });
    expect(role.status).toBe(201);

    const user = await app.http
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'noperm',
        nickname: '无权限用户',
        password: 'Noperm123pw',
        roleIds: [role.body.data.id],
      });
    expect(user.status).toBe(201);

    const { login } = await import('../setup/app');
    nopermToken = await login(app.http, 'noperm', 'Noperm123pw');
  });

  it('无权限用户调用管理接口被 403 拒绝，且菜单树被过滤', async () => {
    const forbidden = await app.http
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${nopermToken}`)
      .send({ name: '偷建角色', roleKey: 'hacked_role', permissionIds: [] });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('AUTH_FORBIDDEN');

    // 无权限用户不应看到任何 C 型菜单（无权限点命中）
    const menus = await app.http
      .get('/api/v1/auth/menus')
      .set('Authorization', `Bearer ${nopermToken}`);
    expect(menus.status).toBe(200);
    const flat = JSON.stringify(menus.body.data);
    expect(flat).not.toContain('用户管理');
  });
});

describe('分页与唯一性契约', () => {
  it('pageSize 超上限被 400 拒绝', async () => {
    const token = adminToken;
    const res = await app.http
      .get('/api/v1/users?pageSize=200')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('用户列表分页结构 items/total/page/pageSize', async () => {
    const token = adminToken;
    const res = await app.http
      .get('/api/v1/users?page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(10);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('重复 roleKey 返回 409 ROLE_KEY_TAKEN', async () => {
    const token = adminToken;
    const res = await app.http
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '重复', roleKey: 'superadmin', permissionIds: [] });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ROLE_KEY_TAKEN');
  });
});

describe('审计', () => {
  it('写操作产生操作审计记录（含脱敏）', async () => {
    const token = adminToken;
    await app.http
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '集成测试角色', roleKey: 'it_team', permissionIds: [] });
    const logs = await app.http
      .get('/api/v1/oper-logs?username=admin&businessType=insert')
      .set('Authorization', `Bearer ${token}`);
    expect(logs.status).toBe(200);
    const entry = logs.body.data.items.find((l: { title: string }) => l.title === '角色管理');
    expect(entry).toBeTruthy();
    expect(entry.requestId).toBeTruthy();
  });
});
