import { defineConfig } from 'unocss';
import { presetApplet, presetRemRpx, transformerApplet } from 'unocss-applet';
import { tgTokens } from './src/theme';

const isMp = process.env?.UNI_PLATFORM?.startsWith('mp-') ?? false;

/**
 * token 单源：色值自 src/theme.ts 引入；字号/圆角以 rem 表达
 * （小程序构建经 presetRemRpx 自动 rem→rpx，1rem=32rpx；H5 保持 rem）。
 * 页面样式一律用工具类引用 token，禁止裸 hex 与魔法字号。
 */
export default defineConfig({
  presets: [presetApplet(), presetRemRpx(isMp ? undefined : { mode: 'rpx2rem' })],
  transformers: [transformerApplet()],
  theme: {
    colors: {
      primary: tgTokens.color.primary,
      success: tgTokens.color.success,
      warning: tgTokens.color.warning,
      danger: tgTokens.color.danger,
      info: tgTokens.color.info,
      page: tgTokens.color.page,
      surface: tgTokens.color.surface,
      ink: tgTokens.color.ink,
      'ink-2': tgTokens.color.ink2,
      'ink-3': tgTokens.color.ink3,
      'success-bg': tgTokens.color.successBg,
      'danger-bg': tgTokens.color.dangerBg,
    },
    fontSize: {
      title: '1.25rem', // 40rpx / 20px，对齐 web --tg-font-size-title
      body: '0.875rem', // 28rpx / 14px，对齐 web --tg-font-size-body
      caption: '0.75rem', // 24rpx / 12px，对齐 web --tg-font-size-caption
      'dialog-title': '1rem', // 32rpx / 16px，对齐 web 弹窗标题档
    },
    borderRadius: {
      control: '0.5rem', // 16rpx / 8px，对齐 web 控件档
      card: '0.75rem', // 24rpx / 12px，对齐 web 卡片档
    },
  },
});
