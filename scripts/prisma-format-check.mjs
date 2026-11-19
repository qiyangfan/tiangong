// Prisma schema 格式化门禁：prisma format 无 --check，故在临时副本上格式化后逐字节比对，
// 不污染工作树。等价 spotless:check 的只读语义。
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const schemaPath = 'apps/api/prisma/schema.prisma';
const dir = mkdtempSync(join(tmpdir(), 'tg-prisma-format-'));
const target = join(dir, 'schema.prisma');
// 直接以 node 执行 api 包内的 prisma CLI，不依赖 shell PATH
const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const prismaCli = requireFromApi.resolve('prisma/build/index.js');

copyFileSync(schemaPath, target);
const result = spawnSync(process.execPath, [prismaCli, 'format', `--schema=${target}`], {
  encoding: 'utf8',
});
if (result.status !== 0) {
  process.stderr.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  rmSync(dir, { recursive: true, force: true });
  process.exit(result.status ?? 1);
}

const before = readFileSync(schemaPath, 'utf8');
const after = readFileSync(target, 'utf8');
rmSync(dir, { recursive: true, force: true });

if (before !== after) {
  console.error(
    'Prisma schema 未按 prisma format 格式化，请运行：pnpm --filter @tiangong/api exec prisma format',
  );
  process.exit(1);
}
console.log('Prisma schema 格式检查通过');
