import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { test as base, expect } from '@playwright/test';

/** 每个用例结束回收页面内的 istanbul 覆盖率，落 .nyc_output 供 nyc 合并。 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
    if (process.env['E2E_COVERAGE'] !== '1') return;
    const coverage = await page
      .evaluate(() => (globalThis as { __coverage__?: unknown }).__coverage__)
      .catch(() => undefined);
    if (!coverage) return;
    mkdirSync('.nyc_output', { recursive: true });
    writeFileSync(`.nyc_output/${process.pid}-${randomUUID()}.json`, JSON.stringify(coverage));
  },
});

export { expect };
