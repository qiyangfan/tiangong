import { defineStore } from 'pinia';
import { i18n } from '@/locales';

export type LocaleCode = 'zh-CN' | 'en';
export type ChromePage = 'login' | 'sample' | 'mine';

const LOCALE_KEY = 'tg_locale';
/** tabBar 页与 pages.json list 顺序的对应；登录页不在 tabBar。 */
const TAB_PAGES: Array<{ page: ChromePage; index: number }> = [
  { page: 'sample', index: 0 },
  { page: 'mine', index: 1 },
];

/** 语言显示名：语言名以母语呈现，不随界面语言翻译。 */
export const LOCALE_LABELS: Record<LocaleCode, string> = {
  'zh-CN': '简体中文',
  en: 'English',
};

/** 全局偏好：语言；并负责导航标题/tabBar 文案的运行时同步（pages.json 编译期中文仅作首帧默认）。 */
export const useAppStore = defineStore('app', {
  state: () => ({
    locale: 'zh-CN' as LocaleCode,
  }),
  actions: {
    /** 装配期调用一次：恢复持久化语言并写入 i18n（非法值回落 zh-CN）。 */
    init(): void {
      const saved = uni.getStorageSync(LOCALE_KEY) as unknown;
      if (saved === 'zh-CN' || saved === 'en') {
        this.locale = saved;
      }
      i18n.global.locale.value = this.locale;
    },
    setLocale(locale: LocaleCode): void {
      this.locale = locale;
      uni.setStorageSync(LOCALE_KEY, locale);
      i18n.global.locale.value = locale;
    },
    toggleLocale(): void {
      this.setLocale(this.locale === 'zh-CN' ? 'en' : 'zh-CN');
    },
    /** 页面 onShow 调用：导航标题与 tabBar 文案对齐当前语言（登录页不在 tabBar，不动 tab 项）。 */
    syncChrome(page: ChromePage): void {
      const t = i18n.global.t;
      uni.setNavigationBarTitle({ title: t(`nav.${page}`) });
      if (page === 'login') {
        return;
      }
      TAB_PAGES.forEach((tab) => {
        uni.setTabBarItem({ index: tab.index, text: t(`nav.${tab.page}`) });
      });
    },
  },
});
