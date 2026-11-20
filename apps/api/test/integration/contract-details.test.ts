import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  permissionGroupSchema,
  profileSchema,
  roleDetailSchema,
  sampleRecordItemSchema,
  userItemSchema,
} from '@tiangong/contracts';
import { errorEnvelope, expectContract, idOf, success } from '../setup/contract';
import { CONTRACT_PROBE } from '../setup/fixtures';
import { adminAuth, testHttp } from './context';

/** 详情类接口的响应契约：列表巡检覆盖不到、但前端实际依赖的读取路径。 */
const permissionListSchema = success(z.array(permissionGroupSchema));

async function adminId(): Promise<number> {
  const res = await testHttp().get('/api/v1/auth/profile').set(adminAuth());
  expect(res.status).toBe(200);
  expectContract(success(profileSchema), res.body, '个人资料');
  return idOf(res.body);
}

async function firstPermission(): Promise<{ id: number; resource: string; action: string }> {
  const res = await testHttp().get('/api/v1/permissions').set(adminAuth());
  expect(res.status).toBe(200);
  const groups = permissionListSchema.parse(res.body).data;
  const permission = groups[0]?.permissions[0];
  if (!permission) {
    throw new Error('权限种子为空，无法验证角色详情');
  }
  return permission;
}

async function createRoleProbe(permissionId: number): Promise<number> {
  const res = await testHttp()
    .post('/api/v1/roles')
    .set(adminAuth())
    .send({ name: '契约探针角色', roleKey: CONTRACT_PROBE.roleKey, permissionIds: [permissionId] });
  expect(res.status).toBe(201);
  return idOf(res.body);
}

async function removeOk(path: string): Promise<void> {
  const res = await testHttp().delete(path).set(adminAuth());
  expect(res.status).toBe(200);
}

describe('响应契约：详情接口', () => {
  it('GET /users/:id 符合契约', async () => {
    const res = await testHttp()
      .get(`/api/v1/users/${await adminId()}`)
      .set(adminAuth());
    expect(res.status).toBe(200);
    expectContract(success(userItemSchema), res.body, '用户详情');
  });

  it('GET /roles/:id 返回权限点详情', async () => {
    const permission = await firstPermission();
    const roleId = await createRoleProbe(permission.id);
    try {
      const res = await testHttp().get(`/api/v1/roles/${roleId}`).set(adminAuth());
      expect(res.status).toBe(200);
      const detail = success(roleDetailSchema).parse(res.body).data;
      expect(detail.permissions).toContain(`${permission.resource}:${permission.action}`);
    } finally {
      await removeOk(`/api/v1/roles/${roleId}`);
    }
  });

  it('GET /samples/:id 符合契约', async () => {
    const created = await testHttp()
      .post('/api/v1/samples')
      .set(adminAuth())
      .send({ name: 'it-契约详情探针', category: 'a', amount: '1.00' });
    expect(created.status).toBe(201);
    const sampleId = idOf(created.body);
    try {
      const res = await testHttp().get(`/api/v1/samples/${sampleId}`).set(adminAuth());
      expect(res.status).toBe(200);
      expectContract(success(sampleRecordItemSchema), res.body, '示例详情');
    } finally {
      await removeOk(`/api/v1/samples/${sampleId}`);
    }
  });

  it('详情不存在时返回统一错误 envelope', async () => {
    const res = await testHttp().get('/api/v1/roles/2147483647').set(adminAuth());
    expect(res.status).toBe(404);
    expectContract(errorEnvelope, res.body, '角色不存在');
  });
});
