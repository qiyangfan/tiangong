import { defineStore } from 'pinia';
import { i18n } from '@/locales';

export type ThemeMode = 'light' | 'dark';
export type LocaleCode = 'zh-CN' | 'en';

const THEME_KEY = 'tg_theme';
const LOCALE_KEY = 'tg_locale';

/** 全局外观状态：主题（暗色一级公民）与语言；侧栏折叠。 */
export const useAppStore = defineStore('app', {
  state: () => ({
    theme: 'light' as ThemeMode,
    locale: 'zh-CN' as LocaleCode,
    sidebarCollapsed: false,
  }),
  actions: {
    /** 恢复持久化的主题与语言（main.ts 装配期调用一次）。 */
    init(): void {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        this.theme = savedTheme;
      }
      const savedLocale = localStorage.getItem(LOCALE_KEY);
      if (savedLocale === 'zh-CN' || savedLocale === 'en') {
        this.locale = savedLocale;
      }
      i18n.global.locale.value = this.locale;
      this.applyTheme();
    },
    applyTheme(): void {
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
    },
    toggleTheme(): void {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, this.theme);
      this.applyTheme();
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
