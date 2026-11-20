import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  dictItemSchema,
  dictOptionSchema,
  dictTypeItemSchema,
  fileItemSchema,
  genDefinitionItemSchema,
  genPreviewFileSchema,
  loginLogItemSchema,
  loginResponseSchema,
  menuNodeSchema,
  menuNodeWithMetaSchema,
  operLogItemSchema,
  permissionGroupSchema,
  profileSchema,
  roleItemSchema,
  sampleRecordItemSchema,
  settingItemSchema,
  uploadResponseSchema,
  userItemSchema,
  userPermissionsSchema,
} from '@tiangong/contracts';
import { ADMIN_CREDENTIALS, CONTRACT_PROBE } from '../setup/fixtures';
import { errorEnvelope, expectContract, idOf, page, success } from '../setup/contract';
import { adminAuth, testHttp } from './context';

/**
 * 响应契约巡检：所有只读列表/详情与代表性写入都用 contracts 的 zod schema 解析，
 * 锁住「接口实际返回形状 == 契约定义」。字段多/少/类型变化都会在此失败，
 * 与 OpenAPI 快照（锁文档）互补。
 */
interface ListCase {
  name: string;
  path: string;
  data: z.ZodType;
}

const LIST_CASES: ListCase[] = [
  { name: 'GET /users', path: '/api/v1/users', data: page(userItemSchema) },
  { name: 'GET /roles', path: '/api/v1/roles', data: page(roleItemSchema) },
  { name: 'GET /permissions', path: '/api/v1/permissions', data: z.array(permissionGroupSchema) },
  { name: 'GET /menus', path: '/api/v1/menus', data: z.array(menuNodeWithMetaSchema) },
  { name: 'GET /auth/menus', path: '/api/v1/auth/menus', data: z.array(menuNodeSchema) },
  { name: 'GET /auth/permissions', path: '/api/v1/auth/permissions', data: userPermissionsSchema },
  { name: 'GET /auth/profile', path: '/api/v1/auth/profile', data: profileSchema },
  { name: 'GET /dict-types', path: '/api/v1/dict-types', data: page(dictTypeItemSchema) },
  {
    name: 'GET /dict-types/:key/items',
    path: '/api/v1/dict-types/sys_user_gender/items',
    data: z.array(dictItemSchema),
  },
  {
    name: 'GET /dicts/:key/options',
    path: '/api/v1/dicts/sys_user_gender/options',
    data: z.array(dictOptionSchema),
  },
  { name: 'GET /settings', path: '/api/v1/settings', data: z.array(settingItemSchema) },
  { name: 'GET /oper-logs', path: '/api/v1/oper-logs', data: page(operLogItemSchema) },
  { name: 'GET /login-logs', path: '/api/v1/login-logs', data: page(loginLogItemSchema) },
  { name: 'GET /files', path: '/api/v1/files', data: page(fileItemSchema) },
  { name: 'GET /samples', path: '/api/v1/samples', data: page(sampleRecordItemSchema) },
  {
    name: 'GET /gen-definitions',
    path: '/api/v1/gen-definitions',
    data: z.array(genDefinitionItemSchema),
  },
];

async function createDictProbe(): Promise<number> {
  const created = await testHttp()
    .post('/api/v1/dict-types')
    .set(adminAuth())
    .send({ name: '契约探针', dictKey: CONTRACT_PROBE.dictKey, remark: '契约巡检' });
  expect(created.status).toBe(201);
  expectContract(success(dictTypeItemSchema), created.body, '创建字典类型');
  return idOf(created.body);
}

async function createDictItemProbe(): Promise<void> {
  const item = await testHttp()
    .post('/api/v1/dict-items')
    .set(adminAuth())
    .send({ dictKey: CONTRACT_PROBE.dictKey, label: '契约项', value: 'p', sort: 1 });
  expect(item.status).toBe(201);
  expectContract(success(dictItemSchema), item.body, '创建字典项');
}

async function createSettingProbe(): Promise<number> {
  const created = await testHttp()
    .post('/api/v1/settings')
    .set(adminAuth())
    .send({ name: '契约探针', settingKey: CONTRACT_PROBE.settingKey, value: '1' });
  expect(created.status).toBe(201);
  expectContract(success(settingItemSchema), created.body, '创建系统参数');
  return idOf(created.body);
}

async function removeOk(path: string): Promise<void> {
  const res = await testHttp().delete(path).set(adminAuth());
  expect(res.status).toBe(200);
}

const GEN_PROBE = {
  name: CONTRACT_PROBE.genName,
  displayName: '契约探针',
  fields: [
    {
      name: 'title',
      label: '标题',
      type: 'string',
      required: true,
      enumOptions: [],
      inList: true,
      inForm: true,
      searchable: true,
    },
  ],
};

async function createGenProbe(): Promise<number> {
  const created = await testHttp().post('/api/v1/gen-definitions').set(adminAuth()).send(GEN_PROBE);
  expect(created.status).toBe(201);
  expectContract(success(genDefinitionItemSchema), created.body, '创建生成定义');
  return idOf(created.body);
}

async function previewGenProbe(id: number): Promise<void> {
  const saved = await testHttp().get(`/api/v1/gen-definitions/${id}/preview`).set(adminAuth());
  expect(saved.status).toBe(200);
  expectContract(success(z.array(genPreviewFileSchema)), saved.body, '按 id 预览');

  const draft = await testHttp()
    .post('/api/v1/gen-definitions/preview')
    .set(adminAuth())
    .send(GEN_PROBE);
  expect(draft.status).toBe(201);
  expectContract(success(z.array(genPreviewFileSchema)), draft.body, '草稿预览');
}

describe('响应契约：只读接口', () => {
  for (const contractCase of LIST_CASES) {
    it(`${contractCase.name} 符合契约`, async () => {
      const res = await testHttp().get(contractCase.path).set(adminAuth());
      expect(res.status, `${contractCase.name} 状态码`).toBe(200);
      expectContract(success(contractCase.data), res.body, contractCase.name);
    });
  }
});

describe('响应契约：认证与错误', () => {
  it('POST /auth/login（miniapp）返回完整会话', async () => {
    const res = await testHttp()
      .post('/api/v1/auth/login')
      .send({ ...ADMIN_CREDENTIALS, client: 'miniapp' });
    expect(res.status).toBe(200);
    expectContract(success(loginResponseSchema), res.body, '登录');
  });

  it('错误响应符合统一错误 envelope', async () => {
    const res = await testHttp().get('/api/v1/users');
    expect(res.status).toBe(401);
    expectContract(errorEnvelope, res.body, '未认证错误');
  });
});

describe('响应契约：字典与参数', () => {
  it('字典类型/项创建与删除返回契约结构', async () => {
    const typeId = await createDictProbe();
    await createDictItemProbe();
    await removeOk(`/api/v1/dict-types/${typeId}`);
  });

  it('系统参数创建与删除返回契约结构', async () => {
    const settingId = await createSettingProbe();
    await removeOk(`/api/v1/settings/${settingId}`);
  });
});

describe('响应契约：示例与生成', () => {
  it('示例数据创建返回契约结构', async () => {
    const created = await testHttp()
      .post('/api/v1/samples')
      .set(adminAuth())
      .send({ name: 'it-契约探针', category: 'a', amount: '1.00' });
    expect(created.status).toBe(201);
    expectContract(success(sampleRecordItemSchema), created.body, '创建示例数据');
    await removeOk(`/api/v1/samples/${idOf(created.body)}`);
  });

  it('生成定义创建、预览与删除返回契约结构', async () => {
    const definitionId = await createGenProbe();
    await previewGenProbe(definitionId);
    await removeOk(`/api/v1/gen-definitions/${definitionId}`);
  });
});

describe('响应契约：文件上传', () => {
  it('上传返回契约结构并可删除', async () => {
    const bytes = Buffer.from('tiangong-contract-probe');
    const res = await testHttp()
      .post('/api/v1/files')
      .set(adminAuth())
      .attach('file', bytes, { filename: 'probe.txt', contentType: 'text/plain' });
    expect(res.status).toBe(201);
    expectContract(success(uploadResponseSchema), res.body, '上传文件');
    await removeOk(`/api/v1/files/${idOf(res.body)}`);
  });
});
