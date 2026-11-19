import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginViaUi } from './helpers';

function rowOf(page: Page, name: string): Locator {
  return page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
}

async function fillField(dialog: Locator, label: string, value: string): Promise<void> {
  await dialog.locator('.el-form-item').filter({ hasText: label }).locator('input').fill(value);
}

/** 金额两位小数是契约展示要求：失焦后应按展示规则补齐。 */
async function fillAmount(dialog: Locator): Promise<void> {
  const amountInput = dialog.locator('.el-form-item').filter({ hasText: '金额' }).locator('input');
  await amountInput.fill('66.6');
  await amountInput.press('Tab');
}

async function createRecord(page: Page, name: string): Promise<Locator> {
  await page.getByRole('button', { name: '新增' }).click();
  const dialog = page.getByRole('dialog');
  await fillField(dialog, '名称', name);
  await fillAmount(dialog);
  await dialog.locator('textarea').fill('e2e 自动化记录');
  await dialog.getByRole('button', { name: '提交' }).click();
  const row = rowOf(page, name);
  await expect(row).toBeVisible();
  await expect(row).toContainText('66.60');
  return row;
}

/** 编辑后断言新名可见、旧名不再命中（exact 匹配防子串误判）。 */
async function editRecord(page: Page, row: Locator, name: string): Promise<Locator> {
  const editedName = `${name}-改`;
  await row.getByRole('button', { name: '修改' }).click();
  await fillField(page.getByRole('dialog'), '名称', editedName);
  await page.getByRole('dialog').getByRole('button', { name: '提交' }).click();
  const editedRow = rowOf(page, editedName);
  await expect(editedRow).toBeVisible();
  await expect(rowOf(page, name)).toHaveCount(0);
  return editedRow;
}

/** 删除：确认框单源。 */
async function deleteRecord(page: Page, row: Locator): Promise<void> {
  await row.getByRole('button', { name: '删除' }).click();
  await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click();
  await expect(row).toHaveCount(0);
}

test.describe('SampleRecord UI 纵向', () => {
  test('新增 → 编辑 → 删除全程实时反映在列表', async ({ page }) => {
    await loginViaUi(page);
    // 整页直达子路由：同时验证 refresh Cookie 会话恢复 + 动态路由重放
    await page.goto('/dev/sample');
    await expect(page).toHaveURL(/\/dev\/sample$/);

    const recordName = `E2E-样例-${Date.now()}`;
    const row = await createRecord(page, recordName);
    const editedRow = await editRecord(page, row, recordName);
    await deleteRecord(page, editedRow);
  });
});
