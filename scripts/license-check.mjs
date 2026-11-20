// 生产依赖许可证白名单（分发合规）。逐 workspace 取 --prod 清单，devDependencies 不在分发范围。
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const allowed = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  // 数据型许可（caniuse/browserslist 数据），需保留署名；SBOM 与 lockfile 留痕
  'CC-BY-4.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  // 弱 copyleft：仅要求公开对 MPL 文件的修改，不传染应用代码（lightningcss 构建期 CSS 解析）
  'MPL-2.0',
  'PSF-2.0',
  'Python-2.0',
  'Unlicense',
  'Zlib',
]);

/** 非标准写法归一（包元数据里存在 "Apache 2.0" 这类变体）。 */
const aliases = new Map([['Apache 2.0', 'Apache-2.0']]);

/** SPDX 表达式按逻辑运算符拆分，要求每个原子许可都在白名单内。 */
function isAllowed(expression) {
  let normalized = expression;
  for (const [from, to] of aliases) {
    normalized = normalized.replaceAll(from, to);
  }
  const atoms = normalized
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter((token) => token !== '' && !['AND', 'OR', 'WITH'].includes(token.toUpperCase()));
  return atoms.length > 0 && atoms.every((atom) => allowed.has(atom));
}

/** 与 pnpm-workspace.yaml 的 apps/*、packages/* 对齐：新增 workspace 自动纳入检查。 */
function workspaceNames() {
  const names = [];
  for (const root of ['apps', 'packages']) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const pkgPath = join(root, entry.name, 'package.json');
      if (!entry.isDirectory() || !existsSync(pkgPath)) continue;
      const { name } = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (typeof name === 'string' && name !== '') names.push(name);
    }
  }
  return names.sort();
}

const workspaces = workspaceNames();
const pnpmCli = process.env['npm_execpath'];
if (pnpmCli === undefined) {
  console.error('license:check 需经 pnpm 脚本运行（npm_execpath 缺失）');
  process.exit(2);
}
// mise 的 pnpm 是原生二进制，不可交给 node 执行；JS 入口（pnpm.cjs）才走 node
const pnpmCommand = /\.[cm]?js$/.test(pnpmCli)
  ? { command: process.execPath, prefix: [pnpmCli] }
  : { command: pnpmCli, prefix: [] };

let failed = false;
for (const workspace of workspaces) {
  const result = spawnSync(
    pnpmCommand.command,
    [...pnpmCommand.prefix, 'licenses', 'list', '--prod', '--filter', workspace, '--json'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    failed = true;
    continue;
  }
  const grouped = JSON.parse(result.stdout);
  for (const [license, packages] of Object.entries(grouped)) {
    if (isAllowed(license)) continue;
    failed = true;
    const names = packages.map((p) => `${p.name}@${p.versions.join(',')}`).join(', ');
    console.error(`[${workspace}] 非白名单许可证 ${license}: ${names}`);
  }
}

if (failed) {
  console.error('许可证检查未通过：新增依赖需先确认许可证并更新 scripts/license-check.mjs 白名单');
  process.exit(1);
}
console.log(`许可证检查通过（${workspaces.length} 个 workspace，仅生产依赖）`);
