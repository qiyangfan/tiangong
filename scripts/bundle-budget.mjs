// 构建体积预算：web 产物 gzip 总量与微信小程序主包原始字节，超标即失败。
// 微信主包硬限 2MB，门禁取 1MiB 提前报警；web 预算按 2026-11-20 实测 714KiB 留 12% 余量。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const KiB = 1024;

function walk(dir, onFile) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, onFile);
    } else if (entry.isFile()) {
      onFile(full);
    }
  }
}

function gzipSize(dir) {
  let total = 0;
  walk(dir, (file) => {
    if (/\.(js|css)$/.test(file)) {
      total += gzipSync(readFileSync(file)).length;
    }
  });
  return total;
}

function rawSize(dir) {
  let total = 0;
  walk(dir, (file) => {
    total += statSync(file).size;
  });
  return total;
}

const targets = [
  { name: 'web js+css (gzip)', dir: 'apps/web/dist/assets', limit: 800 * KiB, measure: gzipSize },
  {
    name: 'mp-weixin main package (raw)',
    dir: 'apps/miniapp/dist/build/mp-weixin',
    limit: 1024 * KiB,
    measure: rawSize,
  },
];

let failed = false;
for (const target of targets) {
  if (!existsSync(target.dir)) {
    console.error(`[size] 缺少构建产物 ${target.dir}，先执行 pnpm build`);
    failed = true;
    continue;
  }
  const size = target.measure(target.dir);
  const detail = `${(size / KiB).toFixed(1)} KiB / ${target.limit / KiB} KiB`;
  if (size > target.limit) {
    console.error(`[size] 超预算 ${target.name}: ${detail}`);
    failed = true;
  } else {
    console.log(`[size] ok ${target.name}: ${detail}`);
  }
}
process.exit(failed ? 1 : 0);
