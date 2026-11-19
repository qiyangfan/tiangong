import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { type RunScript } from './database';

/** API 包根：prisma/schema.prisma 与 package.json 的 prisma.seed 所在目录。 */
export const API_ROOT = path.resolve(__dirname, '../..');

const PNPM_INSTALL_LAYOUT = path.join('lib', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs');

interface PnpmInvocation {
  command: string;
  prefix: string[];
}

/**
 * pnpm 入口：JS 入口用当前 Node 执行，原生二进制（mise 安装）直接执行。
 * 优先取 npm_execpath（pnpm 脚本注入）；缺失时回退到本 Node 安装下的 pnpm.cjs，再回退 PATH。
 */
function pnpmInvocation(): PnpmInvocation {
  const injected = process.env['npm_execpath'];
  if (injected && injected.includes('pnpm')) {
    return /\.[cm]?js$/.test(injected)
      ? { command: process.execPath, prefix: [injected] }
      : { command: injected, prefix: [] };
  }
  const nodeRoot = path.dirname(path.dirname(process.execPath));
  const layoutEntry = path.join(nodeRoot, PNPM_INSTALL_LAYOUT);
  return existsSync(layoutEntry)
    ? { command: process.execPath, prefix: [layoutEntry] }
    : { command: 'pnpm', prefix: [] };
}

export const runPnpm: RunScript = (args, label) => {
  const { command, prefix } = pnpmInvocation();
  const result = spawnSync(command, [...prefix, ...args], {
    cwd: API_ROOT,
    stdio: 'pipe',
    env: { ...process.env },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`${label} exited with ${String(result.status)}: ${result.stderr}`);
  }
};
