import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// uni 全局桩：storage 内存 map，导航标题与 tabBar 记录调用（不锁文案值，只锁结构行为）
const storage = new Map<string, unknown>();
const navTitleCalls: string[] = [];
const tabItemCalls: Array<{ index: number; text: string }> = [];

vi.stubGlobal('uni', {
  getStorageSync: (key: string) => storage.get(key),
  setStorageSync: (key: string, value: unknown) => {
    storage.set(key, value);
  },
  setNavigationBarTitle: (opts: { title: string }) => {
    navTitleCalls.push(opts.title);
  },
  setTabBarItem: (opts: { index: number; text: string }) => {
    tabItemCalls.push(opts);
  },
});

import { i18n } from '@/locales';
import { LOCALE_LABELS, useAppStore } from '../app';

beforeEach(() => {
  setActivePinia(createPinia());
  storage.clear();
  navTitleCalls.length = 0;
  tabItemCalls.length = 0;
  i18n.global.locale.value = 'zh-CN';
});

describe('语言偏好 store', () => {
  it('init 无持久化：默认 zh-CN 并联动 i18n', () => {
    const store = useAppStore();
    store.init();

    expect(store.locale).toBe('zh-CN');
    expect(i18n.global.locale.value).toBe('zh-CN');
    expect(storage.get('tg_locale')).toBeUndefined();
  });

  it('init 恢复合法持久化语言', () => {
    storage.set('tg_locale', 'en');
    const store = useAppStore();
    store.init();

    expect(store.locale).toBe('en');
    expect(i18n.global.locale.value).toBe('en');
  });

  it('init 非法持久化值回落 zh-CN（fail-closed）', () => {
    storage.set('tg_locale', 'fr');
    const store = useAppStore();
    store.init();

    expect(store.locale).toBe('zh-CN');
    expect(i18n.global.locale.value).toBe('zh-CN');
  });

  it('setLocale 持久化并联动 i18n；语言显示名覆盖两种语言', () => {
    const store = useAppStore();

    store.setLocale('en');
    expect(storage.get('tg_locale')).toBe('en');
    expect(i18n.global.locale.value).toBe('en');
    expect(LOCALE_LABELS[store.locale]).toBeTruthy();

    store.setLocale('zh-CN');
    expect(storage.get('tg_locale')).toBe('zh-CN');
    expect(i18n.global.locale.value).toBe('zh-CN');
    expect(LOCALE_LABELS[store.locale]).toBeTruthy();
  });

  it('toggleLocale 在双语间往返', () => {
    const store = useAppStore();
    store.toggleLocale();
    expect(store.locale).toBe('en');
    store.toggleLocale();
    expect(store.locale).toBe('zh-CN');
  });
});

describe('导航标题/tabBar 同步', () => {
  it('登录页只设置标题，不动 tabBar', () => {
    const store = useAppStore();
    store.syncChrome('login');

    expect(navTitleCalls).toHaveLength(1);
    expect(tabItemCalls).toHaveLength(0);
  });

  it('tab 页设置标题并同步两个 tab 项（索引与 pages.json 一致）', () => {
    const store = useAppStore();
    store.syncChrome('mine');

    expect(navTitleCalls).toHaveLength(1);
    expect(tabItemCalls).toEqual([
      { index: 0, text: expect.any(String) },
      { index: 1, text: expect.any(String) },
    ]);
  });

  it('syncChrome 取当前语言：切换语言后标题随之变化（不锁具体文案值）', () => {
    const store = useAppStore();
    store.syncChrome('sample');
    const titleBefore = navTitleCalls[0];

    store.setLocale('en');
    store.syncChrome('sample');

    expect(navTitleCalls).toHaveLength(2);
    expect(navTitleCalls[1]).not.toBe(titleBefore);
  });
});
