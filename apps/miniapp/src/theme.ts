/**
 * 设计 token 常量：色值事实源，uno.config.ts 的 theme 与 wot 组件库桥接
 * （wotThemeVars）共用；与 web 基线对齐（品牌绀青 / 竹青 / 赭金 / 赭红 / 灰墨，
 * 文字三级同 EP 亮色值）。pages.json 为静态 JSON 无法引用本文件，其色值须与本表
 * 同步（纪律见 UI_STYLEGUIDE）。
 */
import type { ConfigProviderThemeVars } from '@/uni_modules/wot-design-uni/components/wd-config-provider/types';

export const tgTokens = {
  color: {
    primary: '#2f5d9e',
    success: '#3d8f63',
    warning: '#b07d2e',
    danger: '#b3402a',
    info: '#6b7280',
    page: '#f2f3f5',
    surface: '#ffffff',
    ink: '#303133',
    ink2: '#606266',
    ink3: '#909399',
    successBg: '#ecf4ef',
    dangerBg: '#f7ecea',
  },
} as const;

/**
 * wot-design-uni 组件库主题变量桥接：色值全部派生自 tgTokens，禁止在本表外
 * 引入新色值（裸 hex 纪律延伸到组件库变量，见 UI_STYLEGUIDE「miniapp 参照执行」）。
 * 深路径 type-only 导入约定见 src/shims/wot-locale.ts 头注。
 */
export const wotThemeVars: ConfigProviderThemeVars = {
  colorTheme: tgTokens.color.primary,
  colorSuccess: tgTokens.color.success,
  colorWarning: tgTokens.color.warning,
  colorDanger: tgTokens.color.danger,
  colorInfo: tgTokens.color.info,
  // v1 无边框态内层 input 定高 24px，加高根节点后文字偏上；统一拉到 46px 控件档（92rpx，
  // 与 login/sample 输入框 h-11.5 一致），原生 input 在该高度内垂直居中
  inputInnerHeightNoBorder: '46px',
};
