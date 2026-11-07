import uni from '@dcloudio/vite-plugin-uni';
import Unocss from 'unocss/vite';
import { defineConfig, type Plugin } from 'vite';

// @dcloudio 包 CJS-only 且类型声明缺失，ESM 配置（.mts）下 default import 得到的是模块
// 对象，运行时须取 .default 才是插件函数（unocss#3776 维护者方案）
const uniPlugin = (uni as unknown as { default?: typeof uni }).default ?? uni;

/**
 * uni 插件对 pnpm 布局硬编码 resolve.preserveSymlinks: true，传递依赖（pinia 的 nostics、
 * vue-i18n 的 @intlify/*）只存在于 pnpm 虚拟仓库，符号链接路径解析必炸。config 钩子按插件
 * 顺序合并、后者覆盖标量，故置于 uni 之后翻回默认的 realpath 解析（与 web 端裸 vite 一致）。
 */
const pnpmRealpathResolution: Plugin = {
  name: 'tg-pnpm-realpath-resolution',
  config() {
    return { resolve: { preserveSymlinks: false } };
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uniPlugin(), Unocss(), pnpmRealpathResolution],
});
