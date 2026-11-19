import type { APIRequestContext } from '@playwright/test';
import { expect, test } from './fixtures';
import { API_BASE, E2E_NOPERM, randomTestPassword } from '../src/env';
import { apiLogin, cleanupE2EFixtures, loginViaUi, type AuthHeaders } from './helpers';

/** 本轮零权限用户口令：beforeAll 生成，建用户与 UI 登录共用。 */
let nopermPassword = '';

async function createNopermFixture(
  request: APIRequestContext,
  headers: AuthHeaders,
  password: string,
): Promise<void> {
  const roleRes = await request.post(`${API_BASE}/roles`, {
    data: { name: E2E_NOPERM.roleName, roleKey: E2E_NOPERM.roleKey, permissionIds: [] },
    headers,
  });
  if (roleRes.status() !== 201) {
    throw new Error(`create role failed: ${roleRes.status()} ${await roleRes.text()}`);
  }
  const roleId = ((await roleRes.json()) as { data: { id: number } }).data.id;

  const userRes = await request.post(`${API_BASE}/users`, {
    data: {
      username: E2E_NOPERM.username,
      nickname: 'e2e 零权限用户',
      password,
      roleIds: [roleId],
    },
    headers,
  });
  if (userRes.status() !== 201) {
    throw new Error(`create user failed: ${userRes.status()} ${await userRes.text()}`);
  }
}

test.describe('RBAC UI 过滤', () => {
  test.beforeAll(async ({ playwright }) => {
    nopermPassword = randomTestPassword();
    const ctx = await playwright.request.newContext();
    const headers: AuthHeaders = { Authorization: `Bearer ${await apiLogin(ctx)}` };
    await cleanupE2EFixtures(ctx, headers);
    await createNopermFixture(ctx, headers, nopermPassword);
    await ctx.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    await cleanupE2EFixtures(ctx);
    await ctx.dispose();
  });

  test('零权限用户：菜单被服务端过滤，未注册路由落 404', async ({ page }) => {
    await loginViaUi(page, E2E_NOPERM.username, nopermPassword);
    await expect(page).toHaveURL(/\/dashboard$/);
    // 导航树是服务端权限过滤结果：零权限即空树（仪表盘无权限点，对所有人可见）
    await expect(page.locator('.tg-sidebar__menu')).not.toContainText('用户管理');
    // 动态路由未注册 → catch-all 兜底 404；API 层越权由集成测试锁定
    await page.goto('/system/user');
    await expect(page).toHaveURL(/\/404$/);
  });
});
