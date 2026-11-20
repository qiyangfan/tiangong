import type { APIRequestContext, Page } from '@playwright/test';
import { API_BASE, E2E_ADMIN, E2E_NOPERM } from '../src/env';

export type AuthHeaders = { Authorization: string };

interface Envelope<T> {
  data: T;
}

interface ItemPage<T> {
  items: T[];
}

/** 成功 envelope 取 data：Playwright 的 json() 无类型，入口处收窄一次。 */
async function readData<T>(res: { json(): Promise<unknown> }): Promise<T> {
  const body = (await res.json()) as Envelope<T>;
  return body.data;
}

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
  const data = await readData<{ accessToken: string }>(res);
  return data.accessToken;
}

async function deleteE2EUsers(request: APIRequestContext, headers: AuthHeaders): Promise<void> {
  const res = await request.get(`${API_BASE}/users?pageSize=100`, { headers });
  const page = await readData<ItemPage<{ id: number; username: string }>>(res);
  for (const item of page.items) {
    if (item.username === E2E_NOPERM.username) {
      await request.delete(`${API_BASE}/users/${item.id}`, { headers });
    }
  }
}

async function deleteE2ERoles(request: APIRequestContext, headers: AuthHeaders): Promise<void> {
  const res = await request.get(`${API_BASE}/roles?pageSize=100`, { headers });
  const page = await readData<ItemPage<{ id: number; roleKey: string }>>(res);
  for (const item of page.items) {
    if (item.roleKey === E2E_NOPERM.roleKey) {
      await request.delete(`${API_BASE}/roles/${item.id}`, { headers });
    }
  }
}

async function deleteE2ESamples(request: APIRequestContext, headers: AuthHeaders): Promise<void> {
  const res = await request.get(`${API_BASE}/samples?keyword=E2E-&pageSize=100`, { headers });
  const page = await readData<ItemPage<{ id: number }>>(res);
  for (const item of page.items) {
    await request.delete(`${API_BASE}/samples/${item.id}`, { headers });
  }
}

/** 清理上一轮残留的 e2e fixture（零权限用户/角色、样例记录），任意顺序可重跑。 */
export async function cleanupE2EFixtures(
  request: APIRequestContext,
  auth?: AuthHeaders,
): Promise<void> {
  const headers: AuthHeaders = auth ?? { Authorization: `Bearer ${await apiLogin(request)}` };
  await deleteE2EUsers(request, headers);
  await deleteE2ERoles(request, headers);
  await deleteE2ESamples(request, headers);
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

/** 内容类 e2e fixture 前缀：套件开跑前统一回收上一轮残留。 */
export const E2E_CONTENT_PREFIX = 'E2E-';

interface NamedRow {
  id: number;
  name: string;
}

interface MenuNodeLike {
  id: number;
  name: string;
  children: MenuNodeLike[];
}

interface CleanupTarget<T> {
  /** 列表接口（含 keyword 过滤） */
  listUrl: string;
  /** 删除接口基路径 */
  deleteBase: string;
  matched: (row: T) => boolean;
}

/** 拉取列表并删除命中行；兼容分页对象与数组两种列表形态。 */
async function deleteMatching<T extends { id: number }>(
  request: APIRequestContext,
  headers: AuthHeaders,
  target: CleanupTarget<T>,
): Promise<void> {
  const res = await request.get(target.listUrl, { headers });
  const data = await readData<T[] | ItemPage<T>>(res);
  const rows = Array.isArray(data) ? data : data.items;
  for (const row of rows) {
    if (target.matched(row)) {
      await request.delete(`${target.deleteBase}/${row.id}`, { headers });
    }
  }
}

/** 删除所有以 E2E- 开头的角色/字典类型/参数/菜单/生成定义（顺序：先叶子后目录）。 */
export async function cleanupE2EContent(
  request: APIRequestContext,
  auth?: AuthHeaders,
): Promise<void> {
  const headers: AuthHeaders = auth ?? { Authorization: `Bearer ${await apiLogin(request)}` };
  const prefixed = (row: NamedRow): boolean => row.name.startsWith(E2E_CONTENT_PREFIX);
  const keyword = E2E_CONTENT_PREFIX;

  await deleteMatching(request, headers, {
    listUrl: `${API_BASE}/roles?keyword=${keyword}&pageSize=100`,
    deleteBase: `${API_BASE}/roles`,
    matched: prefixed,
  });
  await deleteMatching(request, headers, {
    listUrl: `${API_BASE}/dict-types?keyword=${keyword}&pageSize=100`,
    deleteBase: `${API_BASE}/dict-types`,
    matched: prefixed,
  });
  await deleteMatching(request, headers, {
    listUrl: `${API_BASE}/settings?keyword=${keyword}`,
    deleteBase: `${API_BASE}/settings`,
    matched: prefixed,
  });
  await deleteMatching(request, headers, {
    listUrl: `${API_BASE}/gen-definitions?keyword=e2e-`,
    deleteBase: `${API_BASE}/gen-definitions`,
    matched: (row: NamedRow) => row.name.startsWith('e2e-'),
  });
  await deleteMatching(request, headers, {
    listUrl: `${API_BASE}/menus`,
    deleteBase: `${API_BASE}/menus`,
    matched: (row: MenuNodeLike) => row.name.startsWith(keyword) && row.children.length === 0,
  });
}
