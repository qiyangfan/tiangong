import AxeBuilder from '@axe-core/playwright';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { API_BASE } from '../src/env';
import { apiLogin, cleanupE2EFixtures, loginViaUi, type AuthHeaders } from './helpers';

interface PageData<T> {
  data: T;
}

async function authHeaders(request: APIRequestContext): Promise<AuthHeaders> {
  return { Authorization: `Bearer ${await apiLogin(request)}` };
}

async function sampleIdByName(
  request: APIRequestContext,
  headers: AuthHeaders,
  name: string,
): Promise<number | undefined> {
  const res = await request.get(
    `${API_BASE}/samples?keyword=${encodeURIComponent(name)}&pageSize=100`,
    { headers },
  );
  const body = (await res.json()) as PageData<{ items: Array<{ id: number; name: string }> }>;
  return body.data.items.find((item) => item.name === name)?.id;
}

function drawerOf(page: Page) {
  return page.locator('.el-drawer').last();
}

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openPanel(page: Page) {
  await loginViaUi(page);
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const drawer = drawerOf(page);
  await expect(drawer.getByText('向 AI 描述你要完成的操作')).toBeVisible();
  return drawer;
}

async function send(page: Page, text: string): Promise<void> {
  const drawer = drawerOf(page);
  await drawer.locator('textarea').fill(text);
  await drawer.getByRole('button', { name: '发送' }).click();
}

async function confirmCard(drawer: ReturnType<typeof drawerOf>, methodPath: string): Promise<void> {
  await expect(drawer.getByText('需确认').last()).toBeVisible({ timeout: 20_000 });
  const card = drawer.locator('.el-card').filter({ hasText: methodPath }).last();
  await card.getByRole('button', { name: '确认执行' }).click();
  await expect(card.getByText('已执行')).toBeVisible({ timeout: 20_000 });
}

async function createViaAi(page: Page, name: string): Promise<void> {
  await send(page, `创建示例数据，名称:${name}`);
  await confirmCard(drawerOf(page), 'POST /samples');
}

async function deleteViaAi(page: Page, id: number): Promise<void> {
  await send(page, `删除示例 ID:${id}`);
  await confirmCard(drawerOf(page), 'DELETE /samples/{id}');
}

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations
    .filter((item) => item.impact === 'serious' || item.impact === 'critical')
    .map((item) => `${item.id}: ${item.help}`);
}

test.beforeEach(async ({ request }) => {
  await cleanupE2EFixtures(request);
});

test.describe('AI 面板纵向', () => {
  test('查询 → 创建（确认）', async ({ page, request }) => {
    const headers = await authHeaders(request);
    const drawer = await openPanel(page);
    const errors = trackConsole(page);

    await send(page, '查询示例数据');
    await expect(drawer.getByText('查询完成。')).toBeVisible({ timeout: 20_000 });

    const name = `E2E-AI-${Date.now()}`;
    await createViaAi(page, name);
    expect(await sampleIdByName(request, headers, name)).toBeDefined();
    expect(errors).toEqual([]);
  });

  test('删除（确认）', async ({ page, request }) => {
    const headers = await authHeaders(request);
    const name = `E2E-AI-DEL-${Date.now()}`;
    const created = await request.post(`${API_BASE}/samples`, {
      headers,
      data: { name, enabled: true },
    });
    const id = (await created.json()) as PageData<{ id: number }>;
    await openPanel(page);
    const errors = trackConsole(page);

    await deleteViaAi(page, id.data.id);
    expect(await sampleIdByName(request, headers, name)).toBeUndefined();
    expect(errors).toEqual([]);
  });

  test('面板 a11y 与删除会话', async ({ page }) => {
    const drawer = await openPanel(page);
    await send(page, '查询示例数据');
    await expect(drawer.getByText('查询完成。')).toBeVisible({ timeout: 20_000 });
    expect(await seriousViolations(page)).toEqual([]);

    await drawer.getByRole('button', { name: '删除会话' }).click();
    await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click();
    await expect(drawer.getByText('向 AI 描述你要完成的操作')).toBeVisible();
  });

  test('空输入按 Enter 不发送', async ({ page }) => {
    const drawer = await openPanel(page);
    await drawer.locator('textarea').press('Enter');
    await expect(drawer.getByText('向 AI 描述你要完成的操作')).toBeVisible();
  });
});

test.describe('AI 面板会话保留', () => {
  test('关闭后重开保留待确认动作与票据', async ({ page }) => {
    const drawer = await openPanel(page);
    await send(page, `创建示例数据，名称:E2E-AI-CLOSE-${Date.now()}`);
    await expect(drawer.getByText('需确认').last()).toBeVisible({ timeout: 20_000 });

    await drawer.getByRole('button', { name: '关闭' }).click();
    await expect(drawer.getByText('需确认').last()).toBeHidden();

    await page.getByRole('button', { name: 'AI 助手' }).click();
    const card = drawer.locator('.el-card').filter({ hasText: 'POST /samples' }).last();
    await card.getByRole('button', { name: '确认执行' }).click();
    await expect(card.getByText('已执行')).toBeVisible({ timeout: 20_000 });
  });
});
