import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let cached: string | undefined;

/** 系统提示词随构建资产复制；缺失时启动失败，避免静默使用空提示。 */
export function loadSystemPrompt(): string {
  if (cached !== undefined) {
    return cached;
  }
  const path = join(__dirname, 'system.md');
  if (!existsSync(path)) {
    throw new Error(`AI system prompt missing: ${path}`);
  }
  cached = readFileSync(path, 'utf8').trim();
  return cached;
}
