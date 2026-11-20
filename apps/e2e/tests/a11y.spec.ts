import AxeBuilder from '@axe-core/playwright';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { API_BASE } from '../src/env';
import { apiLogin, loginViaUi } from './helpers';

/** 菜单树最小形状：只取导航遍历所需字段（完整契约由集成测试校验）。 */
interface MenuNode {
  menuType: 'M' | 'C' | 'F';
  path: string | null;
  enabled: boolean;
  children: MenuNode[];
}

/** 后端菜单树 → 可访问的 C 型页面绝对路径（M 目录路径参与拼接）。 */
function collectPaths(nodes: MenuNode[], base = ''): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (!node.enabled || node.menuType === 'F') {
      continue;
    }
    const raw = node.path ?? '';
    const full = raw.startsWith('/') ? raw : `${base}/${raw}`;
    if (node.menuType === 'C') {
      paths.push(full);
    } else {
      paths.push(...collectPaths(node.children, full));
    }
  }
  return paths;
}

async function menuPaths(request: APIRequestContext): Promise<string[]> {
  const headers = { Authorization: `Bearer ${await apiLogin(request)}` };
  const res = await request.get(`${API_BASE}/auth/menus`, { headers });
  const body = (await res.json()) as { data: MenuNode[] };
  return [...new Set(collectPaths(body.data))];
}

/** 只拦 serious/critical：minor/moderate 多为 EP 组件的设计取舍，不阻断。 */
async function seriousViolations(page: Page): Promise<string[]> {
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

/** 页面渲染完成：骨架出现且数据加载遮罩退场，避免扫到加载中的中间态。 */
async function settle(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('.tg-page'), `${path} 页面骨架`).toBeVisible();
  await expect(page.locator('.el-loading-mask'), `${path} 加载遮罩`).toHaveCount(0, {
    timeout: 10_000,
  });
}

function describeViolations(path: string, violations: string[]): string {
  return `${path}\n  ${violations.join('\n  ')}`;
}

/** 逐页扫描并返回违规报告；无违规页面不产生条目。 */
async function scanPaths(page: Page, paths: string[]): Promise<string[]> {
  const report: string[] = [];
  for (const path of paths) {
    await settle(page, path);
    const violations = await seriousViolations(page);
    if (violations.length > 0) {
      report.push(describeViolations(path, violations));
    }
  }
  return report;
}

/** 菜单树外的静态页：个人中心与 404（后者无 .tg-page 骨架，按文案判定就绪）。 */
async function scanStaticPaths(page: Page): Promise<string[]> {
  const report: string[] = [];
  await settle(page, '/profile');
  const profileViolations = await seriousViolations(page);
  if (profileViolations.length > 0) {
    report.push(describeViolations('/profile', profileViolations));
  }
  report.push(...(await scanNotFound(page)));
  return report;
}

async function scanNotFound(page: Page): Promise<string[]> {
  await page.goto('/404');
  await expect(page.getByText('404', { exact: true })).toBeVisible();
  const violations = await seriousViolations(page);
  return violations.length > 0 ? [describeViolations('/404', violations)] : [];
}

test.describe('可访问性（运行时）', () => {
  test('登录页无 serious/critical 违规', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('登录后按菜单树遍历全部页面无 serious/critical 违规', async ({ page, request }) => {
    const paths = await menuPaths(request);
    // 菜单覆盖面自检：种子菜单至少包含仪表盘与三个目录下的页面
    expect(paths.length).toBeGreaterThanOrEqual(10);
    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/system/user');

    await loginViaUi(page);
    const report = [...(await scanPaths(page, paths)), ...(await scanStaticPaths(page))];
    expect(report, `以下页面存在 serious/critical 可访问性违规：\n${report.join('\n')}`).toEqual(
      [],
    );
  });
});
