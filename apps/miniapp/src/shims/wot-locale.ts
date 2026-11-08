/**
 * wot-design-uni locale 模块类型垫片（vue-tsc 专用，运行时不受影响）。
 *
 * 为什么存在：库源码以未编译 TS 发布且整体排除在 tsconfig 之外（exclude:
 * src/uni_modules），本仓严格设置（noUncheckedIndexedAccess）会在库内约 50 处
 * 报类型错误；locale 入口经 tsconfig paths 指到这里，使其不进检查程序。
 * 运行时 vite 经 `@` 别名解析到真实模块，本文件不参与构建。
 *
 * 约定（写代码时遵守）：
 * - 从库内导入类型一律走深路径 type-only，如
 *   `import type { ConfigProviderThemeVars } from '@/uni_modules/wot-design-uni/components/wd-config-provider/types'`；
 *   禁止从包根 `@/uni_modules/wot-design-uni` 导入——根 index 会把全量组件源拉进检查程序。
 * - 本垫片必须保持 .ts 形态（.d.ts 会触发 vue-tsc Debug Failure 编译器崩溃）。
 */
type WotMessage = Record<string, unknown>;

const Locale = {
  messages: (): WotMessage => ({}),
  use: (_newLang: string, _newMessage?: WotMessage): void => undefined,
  add: (_newMessages?: Record<string, WotMessage>): void => undefined,
};

export function useCurrentLang(): { value: string } {
  return { value: 'zh-CN' };
}

export { Locale };
export default Locale;
