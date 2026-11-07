import { describe, expect, it } from 'vitest';
import { formatCost, formatDate, formatDateTime } from '../datetime';

/** 以同一 Date 对象构造期望值，断言与宿主时区无关。 */
function localStamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

describe('formatDateTime', () => {
  it('空值与非法值返回占位符 -', () => {
    expect(formatDateTime(null)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
    expect(formatDateTime('')).toBe('-');
    expect(formatDateTime('not-a-date')).toBe('-');
  });

  it('ISO UTC 串按本地时区渲染 YYYY-MM-DD HH:mm:ss', () => {
    const iso = '2026-11-07T08:09:10Z';
    expect(formatDateTime(iso)).toBe(localStamp(iso));
  });
});

describe('formatDate', () => {
  it('取日期部分；空值/非法值返回 -', () => {
    const iso = '2026-11-07T08:09:10Z';
    expect(formatDate(iso)).toBe(localStamp(iso).slice(0, 10));
    expect(formatDate(null)).toBe('-');
    expect(formatDate('garbage')).toBe('-');
  });
});

describe('formatCost', () => {
  it('毫秒与秒的分界与一位小数', () => {
    expect(formatCost(0)).toBe('0 ms');
    expect(formatCost(999)).toBe('999 ms');
    expect(formatCost(1000)).toBe('1.0 s');
    expect(formatCost(1234)).toBe('1.2 s');
    expect(formatCost(1500)).toBe('1.5 s');
  });
});
