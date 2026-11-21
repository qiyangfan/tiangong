import { describe, expect, it } from 'vitest';
import type { LoginResponse, Profile, RefreshResponse, UserPermissions } from '@tiangong/contracts';
import { ADMIN_CREDENTIALS, WRONG_CREDENTIALS } from '../setup/fixtures';
import { adminAuth, nopermAuth, testHttp } from './context';

const codeOf = (body: unknown): string => (body as { code: string }).code;

function dataOf<T>(body: unknown): T {
  return (body as { data: T }).data;
}

interface LoginEnvelope {
  code: number;
  data: LoginResponse;
}

/** Set-Cookie 可能是字符串或数组，统一拼接后再匹配属性。 */
function setCookieHeader(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? raw.join('\n') : (raw ?? '');
}

/** refresh Cookie 必须 HttpOnly 且限定在 auth 路径。 */
function expectRefreshCookie(raw: string | string[] | undefined): void {
  const cookie = setCookieHeader(raw);
  expect(cookie).toContain('tg_refresh=');
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('Path=/api/v1/auth');
}

async function loginWeb(body: { username: string; password: string }) {
  return testHttp()
    .post('/api/v1/auth/login')
    .send({ ...body, client: 'web' });
}

async function loginMiniapp(body: { username: string; password: string }) {
  return testHttp()
    .post('/api/v1/auth/login')
    .send({ ...body, client: 'miniapp' });
}

function refresh(refreshToken: string) {
  return testHttp().post('/api/v1/auth/refresh').send({ refreshToken, client: 'miniapp' });
}

describe('认证契约：登录与会话', () => {
  it('错误密码返回 401 + 稳定错误码（不泄露用户是否存在）', async () => {
    const res = await loginWeb(WRONG_CREDENTIALS);
    expect(res.status).toBe(401);
    expect(codeOf(res.body)).toBe('AUTH_INVALID_CREDENTIALS');
    expect(dataOf(res.body)).toBeNull();
    expect(typeof (res.body as { requestId: string }).requestId).toBe('string');
  });

  it('缺 client 被校验管道拒绝 400', async () => {
    const res = await testHttp().post('/api/v1/auth/login').send(ADMIN_CREDENTIALS);
    expect(res.status).toBe(400);
    expect(codeOf(res.body)).toBe('VALIDATION_ERROR');
  });

  it('web 登录成功：envelope + HttpOnly refresh Cookie，不回传 refresh 到响应体', async () => {
    const res = await loginWeb(ADMIN_CREDENTIALS);
    const body = res.body as LoginEnvelope;
    expect(res.status).toBe(200);
    expect(body.code).toBe(0);
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.user.permissions).toContain('*:*:*');
    expect(body.data.refreshToken).toBeUndefined();
    expectRefreshCookie(res.headers['set-cookie']);
  });

  it('用户名大小写不敏感（citext 保留 MySQL 语义）', async () => {
    const res = await loginWeb({
      ...ADMIN_CREDENTIALS,
      username: ADMIN_CREDENTIALS.username.toUpperCase(),
    });
    expect(res.status).toBe(200);
    expect((res.body as LoginEnvelope).data.user.username).toBe(ADMIN_CREDENTIALS.username);
  });

  it('miniapp refresh 轮换：旧 refresh 复用被拒', async () => {
    const login = await loginMiniapp(ADMIN_CREDENTIALS);
    const firstRefresh = (login.body as LoginEnvelope).data.refreshToken ?? '';
    const rotated = await refresh(firstRefresh);
    expect(rotated.status).toBe(200);
    expect(dataOf<RefreshResponse>(rotated.body).accessToken).toEqual(expect.any(String));

    const replay = await refresh(firstRefresh);
    expect(replay.status).toBe(401);
    expect(codeOf(replay.body)).toBe('AUTH_REFRESH_INVALID');
  });
});

describe('认证契约：受保护接口', () => {
  it('无 token 访问受保护接口返回 401，伪造 token 返回 401', async () => {
    const no = await testHttp().get('/api/v1/auth/profile');
    expect(no.status).toBe(401);
    expect(codeOf(no.body)).toBe('AUTH_UNAUTHENTICATED');

    const bad = await testHttp()
      .get('/api/v1/auth/profile')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(bad.status).toBe(401);
    expect(codeOf(bad.body)).toBe('AUTH_TOKEN_INVALID');
  });

  it('携带 access token 可读个人信息', async () => {
    const res = await testHttp().get('/api/v1/auth/profile').set(adminAuth());
    expect(res.status).toBe(200);
    expect((res.body as LoginEnvelope).code).toBe(0);
    expect(dataOf<Profile>(res.body).username).toBe(ADMIN_CREDENTIALS.username);
  });
});

describe('RBAC 默认拒绝', () => {
  it('无权限用户调用管理接口被 403 拒绝，且菜单树被过滤', async () => {
    const forbidden = await testHttp()
      .post('/api/v1/roles')
      .set(nopermAuth())
      .send({ name: '偷建角色', roleKey: 'hacked_role', permissionIds: [] });
    expect(forbidden.status).toBe(403);
    expect(codeOf(forbidden.body)).toBe('AUTH_FORBIDDEN');

    // 无权限用户不应看到任何 C 型菜单（无权限点命中）
    const menus = await testHttp().get('/api/v1/auth/menus').set(nopermAuth());
    expect(menus.status).toBe(200);
    expect(JSON.stringify(menus.body as unknown)).not.toContain('用户管理');
  });

  it('permissions 端点返回当前用户权限串（超管通配，零权限用户为空）', async () => {
    const admin = await testHttp().get('/api/v1/auth/permissions').set(adminAuth());
    expect(admin.status).toBe(200);
    expect(dataOf<UserPermissions>(admin.body).permissions).toContain('*:*:*');

    const noperm = await testHttp().get('/api/v1/auth/permissions').set(nopermAuth());
    expect(noperm.status).toBe(200);
    expect(dataOf<UserPermissions>(noperm.body).permissions).toEqual([]);
  });
});
