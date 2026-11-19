import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { GenPreviewFile } from '@tiangong/contracts';

interface OutputPair {
  rel: string;
  abs: string;
  content: string;
}

function overwriteMessage(files: string[]): string {
  const details = files.map((f) => `  - ${f}`).join('\n');
  return `refusing to overwrite existing files:\n${details}`;
}

function toPairs(rootDir: string, files: GenPreviewFile[]): OutputPair[] {
  return files.map((f) => ({ rel: f.path, abs: path.join(rootDir, f.path), content: f.content }));
}

async function findExisting(pairs: OutputPair[]): Promise<string[]> {
  const existing: string[] = [];
  for (const p of pairs) {
    try {
      await fs.access(p.abs);
      existing.push(p.rel);
    } catch {
      // 不存在即目标位置可用
    }
  }
  return existing;
}

async function writePairs(pairs: OutputPair[]): Promise<void> {
  for (const p of pairs) {
    await fs.mkdir(path.dirname(p.abs), { recursive: true });
    await fs.writeFile(p.abs, p.content, 'utf8');
  }
}

/** 已存在文件拒绝覆盖（CLI 落盘红线：避免覆盖人工改动）。 */
export class GenOverwriteError extends Error {
  readonly files: string[];

  constructor(files: string[]) {
    super(overwriteMessage(files));
    this.name = 'GenOverwriteError';
    this.files = files;
  }
}

/**
 * 把渲染产物写入 rootDir（path 为相对仓库根路径）。
 * 任一目标文件已存在即整体拒绝（先全量检查再写盘，不产生半套产物）。
 */
export async function writeGeneratedFiles(
  rootDir: string,
  files: GenPreviewFile[],
): Promise<string[]> {
  const pairs = toPairs(rootDir, files);
  const existing = await findExisting(pairs);
  if (existing.length > 0) {
    throw new GenOverwriteError(existing);
  }
  await writePairs(pairs);
  return pairs.map((p) => p.rel);
}
