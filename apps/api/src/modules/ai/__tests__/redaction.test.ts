import { describe, expect, it } from 'vitest';
import { redact, stableStringify, truncateText } from '../redaction';

describe('AI 脱敏与序列化', () => {
  it('递归遮蔽敏感 key，保留普通字段', () => {
    expect(
      redact({
        name: '示例',
        password: 'plain',
        nested: { accessToken: 't', secretKey: 's', ok: 1 },
        list: [{ token: 'x' }, 2],
      }),
    ).toEqual({
      name: '示例',
      password: '[MASKED]',
      nested: { accessToken: '[MASKED]', secretKey: '[MASKED]', ok: 1 },
      list: [{ token: '[MASKED]' }, 2],
    });
  });

  it('stableStringify 对对象键排序，数组顺序保持', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: [3, 1] } })).toBe('{"a":{"c":[3,1],"d":2},"b":1}');
  });

  it('truncateText 超限时总长度不超过上限', () => {
    expect(truncateText('abc', 5)).toBe('abc');
    expect(truncateText('abcdef', 3)).toBe('abc');
    const truncated = truncateText('a'.repeat(30), 20);
    expect(truncated).toHaveLength(20);
    expect(truncated.endsWith('…[truncated]')).toBe(true);
  });
});
