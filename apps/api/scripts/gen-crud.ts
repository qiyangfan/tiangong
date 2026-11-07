/**
 * gen:crud CLI——从 gen_definition 读取元数据，渲染并落盘生成物。
 * 位于 apps/api/scripts（pnpm 严格解析下须在依赖链内 import Prisma client 与渲染器）。
 * 与服务端预览共用同一渲染器（modules/generator/render），预览即落盘结果。
 *
 * 用法：pnpm gen:crud <module-name>
 * 红线：任一目标文件已存在即整体拒绝，绝不覆盖人工改动。
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { GenFieldDef } from '@tiangong/contracts';
import { PrismaClient } from '@prisma/client';
import { renderGenFiles } from '../src/modules/generator/render';
import { GenOverwriteError, writeGeneratedFiles } from '../src/modules/generator/render/writer';

/**
 * 仓库根 = 从 cwd 向上找 pnpm-workspace.yaml。
 * 不能用 import.meta.url：tsx 按包内 CJS 转译时其 shim 指向不可靠。
 */
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8 && path.dirname(dir) !== dir; i++) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  console.error('[gen:crud] cannot locate repo root (pnpm-workspace.yaml not found)');
  process.exit(1);
}

async function main(): Promise<void> {
  const name = process.argv[2];
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error('usage: pnpm gen:crud <module-name>  (module name must be kebab-case)');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const def = await prisma.genDefinition.findUnique({ where: { name } });
    if (!def) {
      console.error(`[gen:crud] definition "${name}" not found (manage via Web 开发工具 → 代码生成)`);
      process.exit(1);
    }
    const files = renderGenFiles({
      name: def.name,
      displayName: def.displayName,
      fields: def.fields as GenFieldDef[],
    });

    const written = await writeGeneratedFiles(findRepoRoot(), files);
    console.log(`[gen:crud] ${def.displayName} (${def.name}) generated ${written.length} files:`);
    for (const rel of written) {
      console.log(`  + ${rel}`);
    }
    console.log(`
[gen:crud] 生成完成。剩余集成步骤（涉及人工改动密集区，不自动改）：
  1. Prisma model：把 apps/api/prisma/gen/${def.name}.model.prisma 合并进 prisma/schema.prisma，
     然后 pnpm --filter @tiangong/api prisma:migrate
  2. 注册模块：app.module.ts imports 加 ${def.name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())}Module
  3. contracts 导出：packages/contracts/src/index.ts 加 export * from './${def.name}.js'
  4. 权限点/菜单：Web 权限管理新建 ${def.name}:list/detail/create/update/delete，菜单管理挂页面
     路由段 ${def.name}（component：${def.name}/index），角色授权
  5. 如字段有枚举/字典诉求：在字典管理建字典类型（生成页用内联选项亦可）`);
  } catch (err) {
    if (err instanceof GenOverwriteError) {
      console.error(`[gen:crud] 拒绝落盘：${err.message}`);
      process.exit(1);
    }
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err: unknown) => {
  console.error('[gen:crud] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
