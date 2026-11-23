import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindTokenBus, refreshSession, tokenBus } from '../token-bus';

const DEFAULTS = {
  getToken: () => null,
  refresh: () => Promise.resolve(false),
  onSessionExpired: () => {},
};

afterEach(() => {
  bindTokenBus(DEFAULTS);
});

describe('tokenBus', () => {
  it('未绑定实现时返回安全的空实现', async () => {
    expect(tokenBus.getToken()).toBeNull();
    await expect(tokenBus.refresh()).resolves.toBe(false);
    expect(() => {
      tokenBus.onSessionExpired();
    }).not.toThrow();
  });

  it('绑定后 request 层可读取 token、刷新与会话失效回调', async () => {
    let expired = '';
    bindTokenBus({
      getToken: () => 'access-token',
      refresh: () => Promise.resolve(true),
      onSessionExpired: (code) => {
        expired = code ?? '';
      },
    });
    expect(tokenBus.getToken()).toBe('access-token');
    await expect(tokenBus.refresh()).resolves.toBe(true);
    tokenBus.onSessionExpired('AUTH_TOKEN_INVALID');
    expect(expired).toBe('AUTH_TOKEN_INVALID');
  });

  it('refreshSession 并发共享同一次刷新', async () => {
    let resolveRefresh!: (value: boolean) => void;
    const refresh = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    bindTokenBus({ getToken: () => 'access-token', refresh, onSessionExpired: () => {} });

    const first = refreshSession();
    const second = refreshSession();
    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh(true);
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  });
});
