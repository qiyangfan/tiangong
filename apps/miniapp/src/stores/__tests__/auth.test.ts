import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// uni 全局桩：与 request.test.ts 同模式（脚本队列 + 内存存储 + 导航记录）
const storage = new Map<string, unknown>();
const launches: string[] = [];
const toasts: string[] = [];
const script: Array<{ statusCode: number; body: unknown }> = [];

vi.stubGlobal('uni', {
  request: (opts: {
    success: (res: { statusCode: number; data: unknown }) => void;
    fail: () => void;
  }) => {
    const next = script.shift();
    if (!next) {
      opts.fail();
      return;
    }
    opts.success({ statusCode: next.statusCode, data: next.body });
  },
  getStorageSync: (key: string) => storage.get(key),
  setStorageSync: (key: string, value: unknown) => {
    storage.set(key, value);
  },
  removeStorageSync: (key: string) => {
    storage.delete(key);
  },
  reLaunch: (opts: { url: string }) => {
    launches.push(opts.url);
  },
  showToast: (opts: { title: string }) => {
    toasts.push(opts.title);
  },
});

import { useAuthStore } from '../auth';
import { getAccessToken, getRefreshToken, getStoredUser, storeSession } from '@/utils/auth';
import type { Profile } from '@tiangong/contracts';

const profileAlice: Profile = {
  id: 1,
  username: 'alice',
  nickname: 'A',
  email: 'alice@example.com',
  avatarFileId: null,
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: null,
};

beforeEach(() => {
  setActivePinia(createPinia());
  script.length = 0;
  storage.clear();
  launches.length = 0;
  toasts.length = 0;
});

describe('会话态 store', () => {
  it('applySession 写入存储并更新身份', () => {
    const store = useAuthStore();
    store.applySession('access-1', 'refresh-1', { id: 1, username: 'alice', nickname: 'A' });

    expect(getAccessToken()).toBe('access-1');
    expect(getRefreshToken()).toBe('refresh-1');
    expect(getStoredUser()?.username).toBe('alice');
    expect(store.isLoggedIn).toBe(true);
  });

  it('applySession 清除上一会话残留的 profile（跨账号不串号）', async () => {
    const store = useAuthStore();
    // 上一会话（如经终局 401 退出，store 未经 logout 清理）残留 profile
    script.push({ statusCode: 200, body: { code: 0, data: profileAlice } });
    await store.refreshProfile();
    expect(store.profile?.username).toBe('alice');

    store.applySession('access-b', 'refresh-b', { id: 2, username: 'bob', nickname: 'B' });

    expect(store.profile).toBeNull();
    expect(store.user?.username).toBe('bob');
  });

  it('restoreUser 从存储恢复身份；空存储回落 null', () => {
    const store = useAuthStore();
    expect(store.isLoggedIn).toBe(false);

    storeSession('access-1', 'refresh-1', { id: 1, username: 'alice', nickname: 'A' });
    store.restoreUser();

    expect(store.user?.username).toBe('alice');
    expect(store.isLoggedIn).toBe(true);

    const fresh = useAuthStore();
    storage.clear();
    fresh.restoreUser();
    expect(fresh.user).toBeNull();
    expect(fresh.isLoggedIn).toBe(false);
  });

  it('refreshProfile 拉取并落 store', async () => {
    const store = useAuthStore();
    script.push({ statusCode: 200, body: { code: 0, data: profileAlice } });

    await store.refreshProfile();

    expect(store.profile?.email).toBe('alice@example.com');
  });

  it('logout 服务端成功：清凭据与身份、回登录页', async () => {
    const store = useAuthStore();
    store.applySession('access-1', 'refresh-1', { id: 1, username: 'alice', nickname: 'A' });
    script.push({ statusCode: 200, body: { code: 0, data: null } });

    await store.logout();

    expect(getAccessToken()).toBe('');
    expect(getRefreshToken()).toBe('');
    expect(store.user).toBeNull();
    expect(store.profile).toBeNull();
    expect(store.isLoggedIn).toBe(false);
    expect(launches).toEqual(['/pages/login/index']);
  });

  it('logout 服务端失败：仍清理本地会话（吊销尽力而为）', async () => {
    const store = useAuthStore();
    store.applySession('access-1', 'refresh-1', { id: 1, username: 'alice', nickname: 'A' });
    // 无脚本 → 网络失败
    await store.logout();

    expect(getAccessToken()).toBe('');
    expect(launches).toEqual(['/pages/login/index']);
    expect(toasts).toHaveLength(1);
  });
});
