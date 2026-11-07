/**
 * 设计 token 常量：色值事实源，uno.config.ts 的 theme 与页面原生组件 prop（如 switch color）
 * 共用；与 web 基线对齐（品牌绀青 / 竹青 / 赭金 / 赭红 / 灰墨，文字三级同 EP 亮色值）。
 * pages.json 为静态 JSON 无法引用本文件，其色值须与本表同步（纪律见 UI_STYLEGUIDE）。
 */
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
