import { expect, test, type APIRequestContext } from '@playwright/test';
import { API_BASE, E2E_NOPERM } from '../src/env';
import { apiLogin, cleanupE2EFixtures, loginViaUi, type AuthHeaders } from './helpers';

async function createNopermFixture(request: APIRequestContext, headers: AuthHeaders): Promise<void> {
  const roleRes = await request.post(`${API_BASE}/roles`, {
    data: { name: E2E_NOPERM.roleName, roleKey: E2E_NOPERM.roleKey, permissionIds: [] },
    headers,
  });
  if (roleRes.status() !== 201) {
    throw new Error(`create role failed: ${roleRes.status()} ${await roleRes.text()}`);
  }
  const roleId = ((await roleRes.json()).data as { id: number }).id;

  const userRes = await request.post(`${API_BASE}/users`, {
    data: {
      username: E2E_NOPERM.username,
      nickname: 'e2e 零权限用户',
      password: E2E_NOPERM.password,
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
    const ctx = await playwright.request.newContext();
    const headers: AuthHeaders = { Authorization: `Bearer ${await apiLogin(ctx)}` };
    await cleanupE2EFixtures(ctx, headers);
    await createNopermFixture(ctx, headers);
    await ctx.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    await cleanupE2EFixtures(ctx);
    await ctx.dispose();
  });

  test('零权限用户：菜单被服务端过滤，未注册路由落 404', async ({ page }) => {
    await loginViaUi(page, E2E_NOPERM.username, E2E_NOPERM.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    // 导航树是服务端权限过滤结果：零权限即空树（仪表盘无权限点，对所有人可见）
    await expect(page.locator('.tg-sidebar__menu')).not.toContainText('用户管理');
    // 动态路由未注册 → catch-all 兜底 404；API 层越权由集成测试锁定
    await page.goto('/system/user');
    await expect(page).toHaveURL(/\/404$/);
  });
});
