import { describe, expect, it } from 'vitest';
import { shouldStepBack } from '../paging';

describe('shouldStepBack', () => {
  it('仅当删空非首页的当前页时回退', () => {
    expect(shouldStepBack(2, 1)).toBe(true);
    expect(shouldStepBack(1, 1)).toBe(false);
    expect(shouldStepBack(3, 20)).toBe(false);
    expect(shouldStepBack(1, 20)).toBe(false);
  });
});
