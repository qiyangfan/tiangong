// tabBar 图标生成：EP icons-vue 同源字形栅格化为 PNG（微信 tabBar 仅收位图，官方建议 81×81）。
// 色值与 tgTokens 同值同步（纪律同 pages.json 静态色值）；字形升级或换色重跑本脚本再生成。
// 运行：node scripts/gen-tab-icons.mjs（chromium 由 apps/e2e 持有的 @playwright/test 提供）
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(new URL('../../e2e/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

// @element-plus/icons-vue 3.x 字形 path（viewBox 0 0 1024 1024）：
// sample=Document（数据记录档），mine=User
const ICONS = {
  sample:
    'M832 384H576V128H192v768h640zm-26.496-64L640 154.496V320zM160 64h480l256 256v608a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32m160 448h384v64H320zm0-192h160v64H320zm0 384h384v64H320z',
  mine: 'M512 512a192 192 0 1 0 0-384 192 192 0 0 0 0 384m0 64a256 256 0 1 1 0-512 256 256 0 0 1 0 512m320 320v-96a96 96 0 0 0-96-96H288a96 96 0 0 0-96 96v96a32 32 0 1 1-64 0v-96a160 160 0 0 1 160-160h448a160 160 0 0 1 160 160v96a32 32 0 1 1-64 0',
};
// tgTokens.color 同值：ink3=#909399 未选中 / primary=#2f5d9e 选中（与 pages.json tabBar color 一致）
const INACTIVE = '#909399';
const ACTIVE = '#2f5d9e';

const outDir = path.resolve(import.meta.dirname, '../src/static');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 81, height: 81 }, deviceScaleFactor: 2 });
for (const [name, d] of Object.entries(ICONS)) {
  for (const [suffix, color] of [
    ['', INACTIVE],
    ['-active', ACTIVE],
  ]) {
    await page.setContent(
      `<style>*{margin:0;padding:0}</style>` +
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="${color}" d="${d}"/></svg>`,
    );
    const svg = await page.$('svg');
    await svg.screenshot({ path: path.join(outDir, `tab-${name}${suffix}.png`) });
    console.log(`generated: static/tab-${name}${suffix}.png`);
  }
}
await browser.close();
