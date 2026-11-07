import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

// 必须在动态 import AppModule 之前覆盖环境（静态导入会提升，故 AppModule 在 setup 中动态加载）
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'mysql://tiangong:tiangong_dev@127.0.0.1:3307/tiangong_test';
process.env.ADMIN_INITIAL_PASSWORD = 'TestAdmin1pw';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_at_least_32_chars_long!!';
process.env.NODE_ENV = 'test';
// 上传落盘指向临时目录，套件结束整体清除
process.env.STORAGE_DIR = path.join(tmpdir(), 'tiangong-it-storage');

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
  await prisma.fileObject.deleteMany({});
  rmSync(path.join(tmpdir(), 'tiangong-it-storage'), { recursive: true, force: true });
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

  it('permissions 端点返回当前用户权限串（超管通配，零权限用户为空）', async () => {
    const admin = await app.http
      .get('/api/v1/auth/permissions')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(admin.status).toBe(200);
    expect(admin.body.data.permissions).toContain('*:*:*');

    const noperm = await app.http
      .get('/api/v1/auth/permissions')
      .set('Authorization', `Bearer ${nopermToken}`);
    expect(noperm.status).toBe(200);
    expect(noperm.body.data.permissions).toEqual([]);
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

describe('文件模块（受控上传与授权下载）', () => {
  const PNG_BYTES = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('tiangong-it-fixture'),
  ]);
  let uploadedId = 0;
  let settingsId = 0;

  it('上传成功：随机存储键 + 元数据（ID/类型/大小/所有者）+ 下载流字节一致', async () => {
    const up = await app.http
      .post('/api/v1/files')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PNG_BYTES, { filename: '测试图.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    expect(up.body.code).toBe(0);
    expect(up.body.data.originalName).toBe('测试图.png');
    expect(up.body.data.suffix).toBe('png');
    expect(up.body.data.sizeBytes).toBe(PNG_BYTES.length);
    expect(up.body.data.url).toBe(`/api/v1/files/${up.body.data.id}/download`);
    uploadedId = up.body.data.id;

    const meta = await prisma.fileObject.findUnique({ where: { id: uploadedId } });
    // 存储键服务端生成：随机 hex + 日期分区，不包含原始文件名的任何分量
    expect(meta?.storageKey).toMatch(/^2\d{3}\/\d{2}\/\d{2}\/[0-9a-f]{32}\.png$/);
    expect(meta?.createdBy).toBeTruthy();

    const down = await app.http
      .get(`/api/v1/files/${uploadedId}/download`)
      .set('Authorization', `Bearer ${adminToken}`)
      .responseType('arraybuffer');
    expect(down.status).toBe(200);
    expect(down.headers['content-type']).toBe('image/png');
    expect(Buffer.from(down.body as ArrayBuffer).equals(PNG_BYTES)).toBe(true);
    expect(down.headers['content-disposition']).toContain("filename*=UTF-8''");
  });

  it('路径遍历文件名被剥离为 basename，写不进存储目录之外', async () => {
    const up = await app.http
      .post('/api/v1/files')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PNG_BYTES, { filename: '../../evil.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    expect(up.body.data.originalName).toBe('evil.png');
  });

  it('扩展名不在白名单返回 415 FILE_TYPE_REJECTED', async () => {
    const up = await app.http
      .post('/api/v1/files')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('MZfake'), { filename: 'evil.exe', contentType: 'application/x-msdownload' });
    expect(up.status).toBe(415);
    expect(up.body.code).toBe('FILE_TYPE_REJECTED');
  });

  it('Content-Type 与扩展名冲突返回 415', async () => {
    const up = await app.http
      .post('/api/v1/files')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('hello'), { filename: 'note.png', contentType: 'text/plain' });
    expect(up.status).toBe(415);
    expect(up.body.code).toBe('FILE_TYPE_REJECTED');
  });

  it('缺 file 字段返回 400 VALIDATION_ERROR', async () => {
    const res = await app.http
      .post('/api/v1/files')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('超过系统参数上限返回 413 FILE_TOO_LARGE（设置读缓存生效）', async () => {
    const list = await app.http.get('/api/v1/settings').set('Authorization', `Bearer ${adminToken}`);
    const setting = list.body.data.find((s: { settingKey: string }) => s.settingKey === 'sys.file.maxSizeMb');
    settingsId = setting.id;
    const shrink = await app.http
      .put(`/api/v1/settings/${settingsId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: '1' });
    expect(shrink.status).toBe(200);

    const big = Buffer.alloc(1.5 * 1024 * 1024, 0x61);
    const up = await app.http
      .post('/api/v1/files')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', big, { filename: 'big.png', contentType: 'image/png' });
    expect(up.status).toBe(413);
    expect(up.body.code).toBe('FILE_TOO_LARGE');

    await app.http
      .put(`/api/v1/settings/${settingsId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: '20' });
  });

  it('无权限用户上传/下载被 403 拒绝（授权下载验收）', async () => {
    const up = await app.http
      .post('/api/v1/files')
      .set('Authorization', `Bearer ${nopermToken}`)
      .attach('file', PNG_BYTES, { filename: 'x.png', contentType: 'image/png' });
    expect(up.status).toBe(403);
    expect(up.body.code).toBe('AUTH_FORBIDDEN');

    const down = await app.http
      .get(`/api/v1/files/${uploadedId}/download`)
      .set('Authorization', `Bearer ${nopermToken}`);
    expect(down.status).toBe(403);
    expect(down.body.code).toBe('AUTH_FORBIDDEN');
  });

  it('删除后元数据消失且下载 404 FILE_NOT_FOUND', async () => {
    const victim = await app.http
      .post('/api/v1/files')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PNG_BYTES, { filename: 'todelete.png', contentType: 'image/png' });
    const id = victim.body.data.id;
    const del = await app.http.delete(`/api/v1/files/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
    const down = await app.http
      .get(`/api/v1/files/${id}/download`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(down.status).toBe(404);
    expect(down.body.code).toBe('FILE_NOT_FOUND');
    uploadedId = 0;
  });
});

describe('SampleRecord 跨端闭环', () => {
  it('web 建档 → miniapp 读取并修改同一条记录 → web 校验可见', async () => {
    const webToken = adminToken;
    const create = await app.http
      .post('/api/v1/samples')
      .set('Authorization', `Bearer ${webToken}`)
      .send({ name: '跨端样例', category: 'a', amount: '12.30', enabled: true });
    expect(create.status).toBe(201);
    expect(create.body.data.amount).toBe('12.30');
    const id = create.body.data.id;

    // 小程序端登录（refresh 走 body、client=miniapp），读写同一条记录
    const miniToken = await loginOnce(app.http);
    const miniRead = await app.http
      .get(`/api/v1/samples/${id}`)
      .set('Authorization', `Bearer ${miniToken}`);
    expect(miniRead.status).toBe(200);
    expect(miniRead.body.data.name).toBe('跨端样例');

    const miniUpdate = await app.http
      .put(`/api/v1/samples/${id}`)
      .set('Authorization', `Bearer ${miniToken}`)
      .send({ name: '跨端样例-小程序改', amount: '99.99' });
    expect(miniUpdate.status).toBe(200);
    expect(miniUpdate.body.data.amount).toBe('99.99');

    const webRead = await app.http
      .get('/api/v1/samples?keyword=小程序改')
      .set('Authorization', `Bearer ${webToken}`);
    expect(webRead.body.data.total).toBe(1);
    expect(webRead.body.data.items[0].name).toBe('跨端样例-小程序改');

    // 无权限用户读写被拒（默认拒绝）
    const denied = await app.http
      .post('/api/v1/samples')
      .set('Authorization', `Bearer ${nopermToken}`)
      .send({ name: '越权样例' });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('AUTH_FORBIDDEN');

    const del = await app.http
      .delete(`/api/v1/samples/${id}`)
      .set('Authorization', `Bearer ${webToken}`);
    expect(del.status).toBe(200);
  });

  it('miniapp 原生 PUT 更新同一条记录（微信 request 合法 method）', async () => {
    const create = await app.http
      .post('/api/v1/samples')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'put样例' });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    const miniToken = await loginOnce(app.http);
    const updated = await app.http
      .put(`/api/v1/samples/${id}`)
      .set('Authorization', `Bearer ${miniToken}`)
      .send({ name: 'put样例-已改' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('put样例-已改');
    await app.http.delete(`/api/v1/samples/${id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('金额非法字符串与超长名称被 400 拒绝', async () => {
    const bad = await app.http
      .post('/api/v1/samples')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '金额非法', amount: '1.234' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('VALIDATION_ERROR');

    const missing = await app.http
      .post('/api/v1/samples')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: 'a' });
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('代码生成器', () => {
  const DEF = {
    name: 'it-gen-item',
    displayName: '集成生成项',
    fields: [
      { name: 'title', label: '标题', type: 'string', required: true, enumOptions: [], inList: true, inForm: true, searchable: true },
      { name: 'grade', label: '等级', type: 'enum', required: true, enumOptions: ['a', 'b'], inList: true, inForm: true, searchable: false },
    ],
  };
  let defId = 0;

  afterAll(async () => {
    if (defId > 0) {
      await prisma.genDefinition.deleteMany({ where: { name: DEF.name } });
    }
  });

  it('创建定义 + 已保存定义预览返回 7 件产物（路径定版）', async () => {
    const create = await app.http
      .post('/api/v1/gen-definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(DEF);
    expect(create.status).toBe(201);
    defId = create.body.data.id;

    const dup = await app.http
      .post('/api/v1/gen-definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(DEF);
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('GEN_NAME_TAKEN');

    const preview = await app.http
      .get(`/api/v1/gen-definitions/${defId}/preview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(preview.status).toBe(200);
    expect(preview.body.data.map((f: { path: string }) => f.path)).toEqual([
      'packages/contracts/src/it-gen-item.ts',
      'apps/api/prisma/gen/it-gen-item.model.prisma',
      'apps/api/src/modules/it-gen-item/it-gen-item.service.ts',
      'apps/api/src/modules/it-gen-item/it-gen-item.controller.ts',
      'apps/api/src/modules/it-gen-item/it-gen-item.module.ts',
      'apps/web/src/api/it-gen-item.ts',
      'apps/web/src/views/it-gen-item/index.vue',
    ]);
  });

  it('草稿预览不落库；enum 无选项被 400 拒绝；模块名创建后不可变', async () => {
    const draft = await app.http
      .post('/api/v1/gen-definitions/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(DEF);
    expect(draft.status).toBe(201);
    expect(draft.body.data).toHaveLength(7);

    const badEnum = await app.http
      .post('/api/v1/gen-definitions/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...DEF,
        name: 'it-gen-bad',
        fields: [DEF.fields[1]].map((f) => ({ ...f, enumOptions: [] })),
      });
    expect(badEnum.status).toBe(400);
    expect(badEnum.body.code).toBe('GEN_FIELD_INVALID');

    const rename = await app.http
      .put(`/api/v1/gen-definitions/${defId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'it-gen-renamed' });
    expect(rename.status).toBe(409);

    const denied = await app.http
      .get(`/api/v1/gen-definitions/${defId}/preview`)
      .set('Authorization', `Bearer ${nopermToken}`);
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('AUTH_FORBIDDEN');
  });
});
