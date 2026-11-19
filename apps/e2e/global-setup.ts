import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { E2E_ADMIN, TEST_DB_URL } from './src/env';

const apiDir = fileURLToPath(new URL('../api', import.meta.url));

/** pnpm 入口由 npm_execpath 提供（本套件经 pnpm 脚本运行），不依赖 PATH 解析。 */
function pnpmInvocation(): { command: string; prefix: string[] } {
  const injected = process.env['npm_execpath'];
  if (!injected?.includes('pnpm')) {
    throw new Error('e2e must run via a pnpm script (npm_execpath is missing)');
  }
  return /\.[cm]?js$/.test(injected)
    ? { command: process.execPath, prefix: [injected] }
    : { command: injected, prefix: [] };
}

/** webServer 拉起前：tiangong_test 迁移 + 种子 + 复位 admin 登录锁定计数（幂等可重跑）。 */
export default function globalSetup(): void {
  const { command, prefix } = pnpmInvocation();
  const env = {
    ...process.env,
    DATABASE_URL: TEST_DB_URL,
    ADMIN_INITIAL_PASSWORD: E2E_ADMIN.password,
  };
  execFileSync(command, [...prefix, 'exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    env,
    stdio: 'inherit',
  });
  execFileSync(command, [...prefix, 'exec', 'prisma', 'db', 'seed'], {
    cwd: apiDir,
    env,
    stdio: 'inherit',
  });
  // 错误密码用例跨轮次累计失败计数会触发 15 分钟锁定，每轮先复位
  execFileSync(
    command,
    [...prefix, 'exec', 'prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--stdin'],
    {
      cwd: apiDir,
      env,
      input: "UPDATE `user` SET failed_attempts = 0, lock_until = NULL WHERE username = 'admin';",
    },
  );
}
