import { defineStore } from 'pinia';
import { i18n } from '@/locales';

export type ThemeMode = 'light' | 'dark';
export type LocaleCode = 'zh-CN' | 'en';

const THEME_KEY = 'tg_theme';
const LOCALE_KEY = 'tg_locale';

/**
 * 切换帧过渡压制类：Element Plus 组件自带 0.2~0.3s 颜色过渡，主题类翻转时
 * 会产生「背景已暗、组件仍在渐变」的明暗混排帧。挂上该类压制全部过渡 100ms，
 * 窗口结束后 hover 等微交互照常恢复（承 energy-ai-platform theme.tsx 同款策略）。
 */
const THEME_SWITCHING_CLASS = 'theme-switching';
const THEME_SWITCHING_SUPPRESS_MS = 100;

let suppressTimer: number | undefined;

function applyThemeClass(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  // 滚动条与原生控件（input/scrollbar）随 color-scheme 同帧翻转，避免滞后一帧
  root.style.colorScheme = mode;
}

/** 全局外观状态：主题（暗色一级公民）与语言；侧栏折叠。 */
export const useAppStore = defineStore('app', {
  state: () => ({
    theme: 'light' as ThemeMode,
    locale: 'zh-CN' as LocaleCode,
    sidebarCollapsed: false,
  }),
  actions: {
    /** 恢复持久化的主题与语言（main.ts 装配期调用一次）；未持久化时跟随系统偏好。 */
    init(): void {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        this.theme = savedTheme;
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.theme = 'dark';
      }
      const savedLocale = localStorage.getItem(LOCALE_KEY);
      if (savedLocale === 'zh-CN' || savedLocale === 'en') {
        this.locale = savedLocale;
      }
      i18n.global.locale.value = this.locale;
      applyThemeClass(this.theme);
    },
    toggleTheme(): void {
      const next: ThemeMode = this.theme === 'light' ? 'dark' : 'light';
      this.theme = next;
      localStorage.setItem(THEME_KEY, next);

      const root = document.documentElement;
      root.classList.add(THEME_SWITCHING_CLASS);
      applyThemeClass(next);
      window.clearTimeout(suppressTimer);
      suppressTimer = window.setTimeout(() => {
        root.classList.remove(THEME_SWITCHING_CLASS);
      }, THEME_SWITCHING_SUPPRESS_MS);
    },
    toggleLocale(): void {
      this.locale = this.locale === 'zh-CN' ? 'en' : 'zh-CN';
      localStorage.setItem(LOCALE_KEY, this.locale);
      i18n.global.locale.value = this.locale;
    },
    toggleSidebar(): void {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
  },
});
