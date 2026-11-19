// CycloneDX SBOM 生成并做 fail-closed 自检：输出缺失、非 JSON 或无组件均视为失败。
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const output = 'sbom.cdx.json';
const pnpmCli = process.env['npm_execpath'];
if (pnpmCli === undefined) {
  console.error('sbom:generate 需经 pnpm 脚本运行（npm_execpath 缺失）');
  process.exit(2);
}
const pnpmCommand = /\.[cm]?js$/.test(pnpmCli)
  ? { command: process.execPath, prefix: [pnpmCli] }
  : { command: pnpmCli, prefix: [] };

const result = spawnSync(
  pnpmCommand.command,
  [...pnpmCommand.prefix, 'sbom', '--sbom-format', 'cyclonedx', '--lockfile-only', '--out', output],
  { stdio: 'inherit' },
);
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

let bom;
try {
  bom = JSON.parse(readFileSync(output, 'utf8'));
} catch {
  console.error(`SBOM 生成失败：${output} 不是合法 JSON`);
  process.exit(1);
}
const components = Array.isArray(bom.components) ? bom.components.length : 0;
if (bom.bomFormat !== 'CycloneDX' || components === 0) {
  console.error(`SBOM 生成失败：bomFormat=${String(bom.bomFormat)} components=${components}`);
  process.exit(1);
}
console.log(`SBOM 生成通过：CycloneDX ${bom.specVersion}，${components} 个组件 → ${output}`);
