import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';
import { loginViaUi } from './helpers';

/** 只拦 serious/critical：minor/moderate 多为 EP 组件的设计取舍，不阻断。 */
async function seriousViolations(page: import('@playwright/test').Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${v.id}(${v.nodes.length}): ${v.help} :: ${v.nodes
          .map(
            (n) =>
              `${n.target.join(' ')} [${n.html.slice(0, 160).replace(/\s+/g, ' ')}] [${(
                n.failureSummary ?? ''
              ).replace(/\s+/g, ' ')}]`,
          )
          .join(' | ')}`,
    );
}

test.describe('可访问性（运行时）', () => {
  test('登录页无 serious/critical 违规', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('登录后仪表盘与系统用户页无 serious/critical 违规', async ({ page }) => {
    await loginViaUi(page);
    await expect(page.getByRole('heading').first()).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.goto('/system/user');
    await expect(page.locator('.el-table')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
