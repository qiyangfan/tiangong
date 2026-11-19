import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import en from '../en';
import zhCN from '../zh-CN';

type Bundle = Record<string, unknown>;

function flatten(bundle: Bundle, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(bundle)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      out.set(path, value);
    } else if (value !== null && typeof value === 'object') {
      for (const [k, v] of flatten(value as Bundle, path)) out.set(k, v);
    }
  }
  return out;
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1] ?? '')
    .sort((a, b) => a.localeCompare(b));
}

const srcDir = fileURLToPath(new URL('../..', import.meta.url));

/** 收集源码里字面量 t('key') / $t('key') 的引用（动态拼接键不在此列）。 */
function scanFile(full: string, used: Map<string, string[]>): void {
  if (!/\.(ts|vue)$/.test(full)) return;
  const text = readFileSync(full, 'utf8');
  for (const match of text.matchAll(/[$]?\bt\(\s*['"]([\w.]+)['"]/g)) {
    const key = match[1] ?? '';
    const files = used.get(key) ?? [];
    files.push(full.slice(srcDir.length + 1));
    used.set(key, files);
  }
}

function collectUsedKeys(): Map<string, string[]> {
  const used = new Map<string, string[]>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (!entry.isDirectory()) {
        scanFile(full, used);
        continue;
      }
      if (entry.name === '__tests__' || entry.name === 'locales' || entry.name === 'uni_modules')
        continue;
      walk(full);
    }
  };
  walk(srcDir);
  return used;
}

const zhFlat = flatten(zhCN);
const enFlat = flatten(en);
const used = collectUsedKeys();

describe('i18n 资源一致性', () => {
  it('zh-CN 与 en 键集合完全一致且无空值', () => {
    expect([...zhFlat.keys()].sort((a, b) => a.localeCompare(b))).toEqual(
      [...enFlat.keys()].sort((a, b) => a.localeCompare(b)),
    );
    for (const [key, value] of zhFlat) {
      expect(value.trim(), `zh-CN.${key} 为空`).not.toBe('');
    }
    for (const [key, value] of enFlat) {
      expect(value.trim(), `en.${key} 为空`).not.toBe('');
    }
  });

  it('同一键的插值占位符两侧一致', () => {
    const mismatched = [...zhFlat].flatMap(([key, zhValue]) => {
      const enValue = enFlat.get(key);
      if (enValue === undefined) return [];
      const zhSlots = placeholders(zhValue);
      const enSlots = placeholders(enValue);
      return zhSlots.join(',') === enSlots.join(',')
        ? []
        : [`${key}: {${zhSlots.join(',')}} vs {${enSlots.join(',')}}`];
    });
    expect(mismatched).toEqual([]);
  });

  it('源码中引用的字面量键都在资源中定义', () => {
    const missing = [...used].flatMap(([key, files]) =>
      zhFlat.has(key) ? [] : [`${key} (${[...new Set(files)].join(', ')})`],
    );
    expect(missing).toEqual([]);
  });
});
