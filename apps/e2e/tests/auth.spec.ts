import { expect, test } from '@playwright/test';
import { loginViaUi, logoutViaUi } from './helpers';

test.describe('认证流', () => {
  test('错误密码返回 401 且停留在登录页', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[autocomplete="username"]').fill('admin');
    await page.locator('input[autocomplete="current-password"]').fill('WrongPass1');
    const loginResponse = page.waitForResponse((r) => r.url().includes('/auth/login'));
    await page.getByRole('button', { name: '登录' }).click();
    expect((await loginResponse).status()).toBe(401);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
  });

  test('成功登录进入仪表盘，侧栏渲染受权限保护的菜单，登出回到登录页', async ({ page }) => {
    await loginViaUi(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('.tg-sidebar__menu')).toContainText('用户管理');
    await logoutViaUi(page);
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
  });

  test('未登录访问受保护路由重定向登录页并携带回跳地址', async ({ page }) => {
    await page.goto('/system/user');
    // vue-router 序列化 query 不编码斜杠
    await expect(page).toHaveURL(/\/login\?redirect=\/system\/user$/);
    // 无 refresh Cookie：会话恢复只探测一次即放行到登录页
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
  });
});
