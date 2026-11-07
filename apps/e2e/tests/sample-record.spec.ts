import { expect, test } from '@playwright/test';
import { loginViaUi } from './helpers';

test.describe('SampleRecord UI 纵向', () => {
  test('新增 → 编辑 → 删除全程实时反映在列表', async ({ page }) => {
    await loginViaUi(page);
    // 整页直达子路由：同时验证 refresh Cookie 会话恢复 + 动态路由重放
    await page.goto('/dev/sample');
    await expect(page).toHaveURL(/\/dev\/sample$/);

    const dialog = page.getByRole('dialog');

    // 新增（金额两位小数是契约展示要求）
    const recordName = `E2E-样例-${Date.now()}`;
    await page.getByRole('button', { name: '新增' }).click();
    await dialog.locator('.el-form-item').filter({ hasText: '名称' }).locator('input').fill(recordName);
    const amountInput = dialog.locator('.el-form-item').filter({ hasText: '金额' }).locator('input');
    await amountInput.fill('66.6');
    await amountInput.press('Tab');
    await dialog.locator('textarea').fill('e2e 自动化记录');
    await dialog.getByRole('button', { name: '提交' }).click();

    const row = page.getByRole('row').filter({ has: page.getByText(recordName, { exact: true }) });
    await expect(row).toBeVisible();
    await expect(row).toContainText('66.60');

    // 编辑
    const editedName = `${recordName}-改`;
    await row.getByRole('button', { name: '修改' }).click();
    await dialog.locator('.el-form-item').filter({ hasText: '名称' }).locator('input').fill(editedName);
    await dialog.getByRole('button', { name: '提交' }).click();

    // exact 匹配：editedName 含 recordName 子串，hasText 会误命中编辑后的行
    const editedRow = page.getByRole('row').filter({ has: page.getByText(editedName, { exact: true }) });
    await expect(editedRow).toBeVisible();
    await expect(page.getByRole('row').filter({ has: page.getByText(recordName, { exact: true }) })).toHaveCount(0);

    // 删除（确认框单源）
    await editedRow.getByRole('button', { name: '删除' }).click();
    await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click();
    await expect(editedRow).toHaveCount(0);
  });
});
