import { describe, expect, it } from 'vitest';
import { hasSensitiveKey } from '../ai.mapper';

describe('hasSensitiveKey', () => {
  it('识别嵌套敏感键', () => {
    expect(hasSensitiveKey({ nested: [{ accessToken: 'x' }] })).toBe(true);
    expect(hasSensitiveKey({ name: 'demo', nested: { enabled: true } })).toBe(false);
  });

  it('超过深度上限的不可信参数 fail-closed', () => {
    const root: Record<string, unknown> = {};
    let cursor = root;
    for (let i = 0; i < 20; i += 1) {
      const next: Record<string, unknown> = {};
      cursor['nested'] = next;
      cursor = next;
    }

    expect(hasSensitiveKey(root)).toBe(true);
  });
});
