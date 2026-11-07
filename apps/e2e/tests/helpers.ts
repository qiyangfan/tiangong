import type { APIRequestContext, Page } from '@playwright/test';
import { API_BASE, E2E_ADMIN, E2E_NOPERM } from '../src/env';

export type AuthHeaders = { Authorization: string };

/** API 层登录（fixture 准备用，不走 UI）。 */
export async function apiLogin(
  request: APIRequestContext,
  username: string = E2E_ADMIN.username,
  password: string = E2E_ADMIN.password,
): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { username, password, client: 'web' },
  });
  if (res.status() !== 200) {
    throw new Error(`api login failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.accessToken as string;
}

/** 清理上一轮残留的 e2e fixture（零权限用户/角色、样例记录），任意顺序可重跑。 */
export async function cleanupE2EFixtures(
  request: APIRequestContext,
  auth?: AuthHeaders,
): Promise<void> {
  const headers: AuthHeaders = auth ?? { Authorization: `Bearer ${await apiLogin(request)}` };

  const users = await request.get(`${API_BASE}/users?pageSize=100`, { headers });
  for (const item of (await users.json()).data.items as Array<{ id: number; username: string }>) {
    if (item.username === E2E_NOPERM.username) {
      await request.delete(`${API_BASE}/users/${item.id}`, { headers });
    }
  }

  const roles = await request.get(`${API_BASE}/roles?pageSize=100`, { headers });
  for (const item of (await roles.json()).data.items as Array<{ id: number; roleKey: string }>) {
    if (item.roleKey === E2E_NOPERM.roleKey) {
      await request.delete(`${API_BASE}/roles/${item.id}`, { headers });
    }
  }

  const samples = await request.get(`${API_BASE}/samples?keyword=E2E-&pageSize=100`, { headers });
  for (const item of (await samples.json()).data.items as Array<{ id: number }>) {
    await request.delete(`${API_BASE}/samples/${item.id}`, { headers });
  }
}

/** UI 登录：定位器用结构性属性（autocomplete），不耦合文案。 */
export async function loginViaUi(
  page: Page,
  username: string = E2E_ADMIN.username,
  password: string = E2E_ADMIN.password,
): Promise<void> {
  await page.goto('/login');
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('**/dashboard');
}

/** UI 登出：头像下拉 → 退出登录 → 确认框。 */
export async function logoutViaUi(page: Page): Promise<void> {
  await page.locator('header .el-dropdown').click();
  await page.locator('.el-dropdown-menu__item').filter({ hasText: '退出登录' }).click();
  await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click();
  await page.waitForURL('**/login');
}
