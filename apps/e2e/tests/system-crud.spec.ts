import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import {
  apiLogin,
  cleanupE2EContent,
  E2E_CONTENT_PREFIX,
  loginViaUi,
  type AuthHeaders,
} from './helpers';

/** 单轮运行唯一后缀：同一库上重复执行不会撞名。 */
const suffix = Date.now().toString(36);
const ROLE_NAME = `${E2E_CONTENT_PREFIX}角色-${suffix}`;
const DICT_NAME = `${E2E_CONTENT_PREFIX}字典-${suffix}`;
const SETTING_NAME = `${E2E_CONTENT_PREFIX}参数-${suffix}`;
const MENU_NAME = `${E2E_CONTENT_PREFIX}目录-${suffix}`;
const GEN_NAME = `e2e-gen-${suffix}`;

let adminHeaders: AuthHeaders;

/** 表单字段定位：SearchForm 部分表单项未声明 prop，label 无 for 关联，按标签精确文本收敛。 */
function field(scope: Locator, label: string): Locator {
  const hasLabel = scope.page().locator('.el-form-item__label').getByText(label, { exact: true });
  return scope
    .locator('.el-form-item')
    .filter({ has: hasLabel })
    .locator('input, textarea')
    .first();
}

function rowByName(page: Page, name: string): Locator {
  return page.locator('.el-table__row').filter({ hasText: name });
}

/** 按弹窗内唯一文案定位并等待打开。 */
async function visibleDialog(page: Page, marker: string): Promise<Locator> {
  const dialog = page.locator('.el-dialog').filter({ hasText: marker });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function submitDialog(dialog: Locator, label = '提交'): Promise<void> {
  await dialog.getByRole('button', { name: label }).click();
  await expect(dialog).toBeHidden();
}

function addButton(page: Page): Locator {
  return page.getByRole('button', { name: '新增', exact: true });
}

async function deleteRow(page: Page, name: string): Promise<void> {
  const row = rowByName(page, name);
  const deleted = page.waitForResponse((res) => res.request().method() === 'DELETE');
  await row.getByRole('button', { name: '删除' }).click();
  await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click();
  expect((await deleted).ok(), `删除 ${name} 未成功`).toBe(true);
  await expect(row).toBeHidden();
}

async function openAuthed(page: Page, path: string): Promise<void> {
  await loginViaUi(page);
  await page.goto(path);
  await expect(page.locator('.el-table').first()).toBeVisible();
}

async function createRole(page: Page): Promise<void> {
  await addButton(page).click();
  const dialog = await visibleDialog(page, '角色名称');
  await field(dialog, '角色名称').fill(ROLE_NAME);
  await field(dialog, '权限字符').fill(`e2e_role_${suffix}`);
  await submitDialog(dialog);
}

async function editRole(page: Page, nextName: string): Promise<void> {
  await rowByName(page, ROLE_NAME).getByRole('button', { name: '修改' }).click();
  const dialog = await visibleDialog(page, '角色名称');
  await field(dialog, '角色名称').fill(nextName);
  await submitDialog(dialog);
}

async function createMenu(page: Page): Promise<void> {
  await addButton(page).click();
  const dialog = await visibleDialog(page, '菜单名称');
  await field(dialog, '菜单名称').fill(MENU_NAME);
  await field(dialog, '路由地址').fill(`/e2e-dir-${suffix}`);
  await submitDialog(dialog);
}

async function createDictType(page: Page): Promise<void> {
  await addButton(page).click();
  const dialog = await visibleDialog(page, '字典名称');
  await field(dialog, '字典名称').fill(DICT_NAME);
  await field(dialog, '字典键').fill(`e2e_dict_${suffix}`);
  await submitDialog(dialog);
}

async function createDictItem(page: Page): Promise<Locator> {
  await rowByName(page, DICT_NAME).getByRole('button', { name: '字典项' }).click();
  const drawer = page.locator('.el-drawer').filter({ hasText: DICT_NAME });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: '新增', exact: true }).click();
  const dialog = await visibleDialog(page, '标签');
  await field(dialog, '标签').fill('E2E项');
  await field(dialog, '键值').fill('e2e');
  await submitDialog(dialog);
  return drawer;
}

async function createSetting(page: Page): Promise<void> {
  await addButton(page).click();
  const dialog = await visibleDialog(page, '参数名称');
  await field(dialog, '参数名称').fill(SETTING_NAME);
  await field(dialog, '参数键名').fill(`e2e.setting.${suffix}`);
  await field(dialog, '参数值').fill('1');
  await submitDialog(dialog);
}

async function updateSetting(page: Page): Promise<void> {
  await rowByName(page, SETTING_NAME).getByRole('button', { name: '修改' }).click();
  const dialog = await visibleDialog(page, '参数名称');
  await field(dialog, '参数值').fill('2');
  await submitDialog(dialog);
}

async function createGenDefinition(page: Page): Promise<void> {
  await addButton(page).click();
  const dialog = await visibleDialog(page, '模块名');
  await field(dialog, '模块名').fill(GEN_NAME);
  await field(dialog, '显示名').fill(`${E2E_CONTENT_PREFIX}生成项`);
  const fieldRow = dialog.locator('.el-table__row').first();
  await fieldRow.locator('input').nth(0).fill('title');
  await fieldRow.locator('input').nth(1).fill('标题');
  await submitDialog(dialog, '保存');
}

async function previewGenDefinition(page: Page): Promise<void> {
  await rowByName(page, GEN_NAME).getByRole('button', { name: '预览' }).click();
  const preview = await visibleDialog(page, '生成预览');
  await expect(preview.locator('pre').first()).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
}

async function searchLogs(
  page: Page,
  query: { path: string; label: string; value: string },
): Promise<void> {
  await page.goto(query.path);
  await expect(page.locator('.el-table__row').first()).toBeVisible();
  await field(page.locator('.tg-page'), query.label).fill(query.value);
  await page.locator('form').getByRole('button', { name: '搜索' }).click();
  await expect(page.locator('.el-table__row').first()).toContainText(query.value);
}

/** 描述列表顺序固定：账号、昵称、邮箱、注册时间、最后登录。 */
function nicknameCell(page: Page): Locator {
  return page.locator('.el-descriptions__content').nth(1);
}

async function changeNickname(page: Page, value: string): Promise<void> {
  await page.getByRole('button', { name: '修改资料' }).click();
  const dialog = await visibleDialog(page, '昵称');
  await field(dialog, '昵称').fill(value);
  await submitDialog(dialog, '保存');
}

test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext();
  adminHeaders = { Authorization: `Bearer ${await apiLogin(ctx)}` };
  await cleanupE2EContent(ctx, adminHeaders);
  await ctx.dispose();
});

test.afterAll(async ({ playwright }) => {
  const ctx: APIRequestContext = await playwright.request.newContext();
  await cleanupE2EContent(ctx, adminHeaders);
  await ctx.dispose();
});

test.describe('角色管理', () => {
  test('新增 → 修改 → 删除', async ({ page }) => {
    await openAuthed(page, '/system/role');
    await createRole(page);
    await expect(rowByName(page, ROLE_NAME)).toBeVisible();
    await editRole(page, `${ROLE_NAME}改`);
    await expect(page.getByText(`${ROLE_NAME}改`)).toBeVisible();
    await deleteRow(page, `${ROLE_NAME}改`);
  });
});

test.describe('菜单管理', () => {
  test('新增目录 → 树中出现 → 删除', async ({ page }) => {
    await openAuthed(page, '/system/menu');
    await createMenu(page);
    await expect(page.getByText(MENU_NAME)).toBeVisible();
    await deleteRow(page, MENU_NAME);
  });
});

test.describe('字典管理', () => {
  test('新增类型 → 新增字典项 → 删除类型', async ({ page }) => {
    await openAuthed(page, '/system/dict');
    await createDictType(page);
    const drawer = await createDictItem(page);
    await expect(drawer.getByText('E2E项')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await deleteRow(page, DICT_NAME);
  });
});

test.describe('系统参数', () => {
  test('新增 → 修改 → 删除', async ({ page }) => {
    await openAuthed(page, '/system/setting');
    await createSetting(page);
    await expect(rowByName(page, SETTING_NAME)).toBeVisible();
    await updateSetting(page);
    await expect(rowByName(page, SETTING_NAME).getByText('2', { exact: true })).toBeVisible();
    await deleteRow(page, SETTING_NAME);
  });
});

test.describe('代码生成', () => {
  test('新增定义 → 预览 → 删除', async ({ page }) => {
    await openAuthed(page, '/dev/gen');
    await createGenDefinition(page);
    await expect(rowByName(page, GEN_NAME)).toBeVisible();
    await previewGenDefinition(page);
    await deleteRow(page, GEN_NAME);
  });
});

test.describe('审计中心', () => {
  test('操作日志与登录日志可查询', async ({ page }) => {
    await loginViaUi(page);
    await searchLogs(page, { path: '/audit/oper-log', label: '操作人', value: 'admin' });
    await searchLogs(page, { path: '/audit/login-log', label: '账号', value: 'admin' });
  });
});

test.describe('个人中心', () => {
  test('修改昵称后回显，并恢复原值', async ({ page }) => {
    await loginViaUi(page);
    await page.goto('/profile');
    await expect(page.getByText('基本资料', { exact: true })).toBeVisible();
    const original = await nicknameCell(page).innerText();
    await changeNickname(page, `${original}-e2e`);
    await expect(nicknameCell(page)).toHaveText(`${original}-e2e`);
    await changeNickname(page, original);
    await expect(nicknameCell(page)).toHaveText(original);
  });
});
