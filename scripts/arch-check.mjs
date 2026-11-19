// 分层门禁：各 workspace 用自己的 tsconfig 解析路径别名后跑 dependency-cruiser。
// 规则单源在 .dependency-cruiser.cjs；任一违规即退出码非零。
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 包 exports 只声明 import 条件，用 ESM 解析后再上溯到包根取 bin 路径
let pkgDir = dirname(fileURLToPath(import.meta.resolve('dependency-cruiser')));
while (!existsSync(join(pkgDir, 'package.json'))) pkgDir = dirname(pkgDir);
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const depcruise = join(pkgDir, pkg.bin['dependency-cruise']);

const targets = [
  ['apps/api', 'apps/api/tsconfig.json'],
  ['apps/web', 'apps/web/tsconfig.json'],
  ['apps/miniapp', 'apps/miniapp/tsconfig.json'],
  ['apps/e2e', 'apps/e2e/tsconfig.json'],
  ['packages/contracts', 'packages/contracts/tsconfig.json'],
];

let failed = false;
for (const [dir, tsConfig] of targets) {
  const result = spawnSync(
    process.execPath,
    [
      depcruise,
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'err',
      '--ts-config',
      tsConfig,
      dir,
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
