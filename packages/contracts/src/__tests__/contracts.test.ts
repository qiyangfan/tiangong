import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  enabledFilterSchema,
  errorMeta,
  loginRequestSchema,
  menuNodeSchema,
  pageQuerySchema,
  passwordSchema,
  decimalStringSchema,
  createUserRequestSchema,
  createRoleRequestSchema,
  genDefinitionRequestSchema,
  menuNodeWithMetaSchema,
  userItemSchema,
  roleDetailSchema,
  dictOptionSchema,
} from '../index.js';

describe('pageQuerySchema（分页契约）', () => {
  it('缺省时 page=1、pageSize=20', () => {
    const parsed = pageQuerySchema.parse({});
    expect(parsed).toEqual({ page: 1, pageSize: 20 });
  });

  it('查询串入参被 coerce 为数字', () => {
    const parsed = pageQuerySchema.parse({ page: '3', pageSize: '50' });
    expect(parsed).toEqual({ page: 3, pageSize: 50 });
  });

  it('pageSize 超上限 100 被拒绝（不静默截断，由管道统一 400）', () => {
    expect(pageQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });

  it('page < 1 被拒绝', () => {
    expect(pageQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe('enabledFilterSchema（启用状态过滤契约）', () => {
  it('query 字符串 true/false 正确解析为布尔', () => {
    expect(enabledFilterSchema.parse('true')).toBe(true);
    expect(enabledFilterSchema.parse('false')).toBe(false);
    expect(enabledFilterSchema.parse(true)).toBe(true);
    expect(enabledFilterSchema.parse(false)).toBe(false);
  });

  it('未提供或非布尔语义值视为 undefined（不参与过滤）', () => {
    expect(enabledFilterSchema.parse(undefined)).toBeUndefined();
    expect(enabledFilterSchema.parse('')).toBeUndefined();
    expect(enabledFilterSchema.parse('1')).toBeUndefined();
  });
});

describe('error-codes（错误码契约）', () => {
  it('错误码全局唯一', () => {
    const codes = Object.keys(ERROR_CODES);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('每个错误码映射到合法 HTTP 状态', () => {
    for (const code of Object.keys(ERROR_CODES)) {
      const { status } = errorMeta(code);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThanOrEqual(599);
    }
  });

  it('未知错误码回落 INTERNAL_ERROR', () => {
    expect(errorMeta('SOMETHING_UNKNOWN').status).toBe(500);
  });

  it('鉴权失败语义使用 401，权限不足使用 403（不可混用）', () => {
    expect(errorMeta('AUTH_INVALID_CREDENTIALS').status).toBe(401);
    expect(errorMeta('AUTH_FORBIDDEN').status).toBe(403);
  });
});

describe('auth 契约', () => {
  it('登录必须携带 client（决定 refresh token 载体）', () => {
    const ok = loginRequestSchema.safeParse({
      username: 'alice',
      password: 'secret123',
      client: 'web',
    });
    expect(ok.success).toBe(true);

    const missing = loginRequestSchema.safeParse({ username: 'alice', password: 'secret123' });
    expect(missing.success).toBe(false);
  });

  it('密码复杂度：字母+数字组合至少 8 位', () => {
    expect(passwordSchema.safeParse('short1').success).toBe(false);
    expect(passwordSchema.safeParse('onlyletters').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
    expect(passwordSchema.safeParse('passw0rd').success).toBe(true);
  });
});

describe('用户与角色契约', () => {
  it('用户名仅允许字母数字下划线', () => {
    const bad = createUserRequestSchema.safeParse({
      username: 'bad name!',
      nickname: 'x',
      password: 'passw0rd',
    });
    expect(bad.success).toBe(false);
  });

  it('createUser 默认启用、默认无角色', () => {
    const parsed = createUserRequestSchema.parse({
      username: 'alice',
      nickname: 'Alice',
      password: 'passw0rd',
    });
    expect(parsed.enabled).toBe(true);
    expect(parsed.roleIds).toEqual([]);
  });

  it('roleKey 必须小写 snake_case（拒绝大写与短横线）', () => {
    const base = { name: '运维', permissionIds: [] };
    expect(createRoleRequestSchema.safeParse({ ...base, roleKey: 'OpsAdmin' }).success).toBe(false);
    expect(createRoleRequestSchema.safeParse({ ...base, roleKey: 'ops-admin' }).success).toBe(
      false,
    );
    expect(createRoleRequestSchema.safeParse({ ...base, roleKey: 'ops_admin' }).success).toBe(true);
  });
});

describe('通用类型', () => {
  it('金额只接受两位小数以内的十进制字符串', () => {
    expect(decimalStringSchema.safeParse('12.34').success).toBe(true);
    expect(decimalStringSchema.safeParse('12.345').success).toBe(false);
    expect(decimalStringSchema.safeParse('12.3.4').success).toBe(false);
    expect(decimalStringSchema.safeParse(12.34).success).toBe(false);
  });

  it('菜单树 schema 支持递归嵌套', () => {
    const tree = {
      id: 1,
      parentId: 0,
      name: '系统管理',
      menuType: 'M',
      path: '/system',
      component: null,
      perms: null,
      icon: 'setting',
      sort: 1,
      visible: true,
      enabled: true,
      children: [
        {
          id: 11,
          parentId: 1,
          name: '用户管理',
          menuType: 'C',
          path: 'user',
          component: 'system/user/index',
          perms: 'system:user:list',
          icon: null,
          sort: 1,
          visible: true,
          enabled: true,
          children: [],
        },
      ],
    };
    expect(menuNodeSchema.safeParse(tree).success).toBe(true);
    expect(menuNodeSchema.safeParse({ ...tree, menuType: 'X' }).success).toBe(false);
  });
});

describe('生成器定义契约', () => {
  const base = {
    name: 'user-profile',
    displayName: '用户资料',
    fields: [
      {
        name: 'title',
        label: '标题',
        type: 'string',
        required: true,
        enumOptions: [],
        inList: true,
        inForm: true,
        searchable: false,
      },
    ],
  };

  it('合法定义通过；元数据文案禁引号/反斜杠/换行与注释终止序列', () => {
    expect(genDefinitionRequestSchema.safeParse(base).success).toBe(true);
    const badLabel = { ...base, fields: [{ ...base.fields[0], label: "it's" }] };
    expect(genDefinitionRequestSchema.safeParse(badLabel).success).toBe(false);
    expect(
      genDefinitionRequestSchema.safeParse({ ...base, displayName: '注释*/终止' }).success,
    ).toBe(false);
  });
});

describe('菜单树（管理端）契约', () => {
  it('带元信息节点含子节点时递归解析通过', () => {
    const leaf = {
      id: 2,
      parentId: 1,
      name: '用户管理',
      menuType: 'C',
      path: 'user',
      component: 'system/user/index',
      perms: null,
      icon: null,
      sort: 1,
      visible: true,
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      remark: null,
      children: [],
    };
    const root = { ...leaf, id: 1, parentId: 0, name: '系统管理', menuType: 'M', children: [leaf] };
    expect(menuNodeWithMetaSchema.safeParse(root).success).toBe(true);
    expect(menuNodeWithMetaSchema.safeParse({ ...root, createdAt: 'not-a-date' }).success).toBe(
      false,
    );
  });
});

describe('响应契约严格性', () => {
  const user = {
    id: 1,
    username: 'admin',
    nickname: '管理员',
    email: null,
    phone: null,
    enabled: true,
    remark: null,
    roles: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: null,
  };

  it('拒绝未声明字段，防止数据库内部字段随响应泄露', () => {
    expect(userItemSchema.safeParse(user).success).toBe(true);
    expect(userItemSchema.safeParse({ ...user, passwordHash: 'leak' }).success).toBe(false);
  });

  it('角色详情经 extend 后仍保持严格模式', () => {
    const role = {
      id: 1,
      name: '角色',
      roleKey: 'role',
      sort: 0,
      enabled: true,
      builtin: false,
      remark: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      permissions: ['system:user:list'],
    };
    expect(roleDetailSchema.safeParse(role).success).toBe(true);
    expect(roleDetailSchema.safeParse({ ...role, extra: 1 }).success).toBe(false);
  });

  it('选项与菜单节点同样拒绝未声明字段', () => {
    expect(dictOptionSchema.safeParse({ label: '男', value: '0', tagType: null }).success).toBe(
      true,
    );
    expect(
      dictOptionSchema.safeParse({ label: '男', value: '0', tagType: null, extra: 1 }).success,
    ).toBe(false);
  });
});
