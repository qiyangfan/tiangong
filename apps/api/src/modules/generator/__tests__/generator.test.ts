import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { genDefinitionRequestSchema, type GenFieldDef } from '@tiangong/contracts';
import { renderGenFiles } from '../render';
import { GenOverwriteError, writeGeneratedFiles } from '../render/writer';

/** 覆盖全部 7 种字段类型的确定性夹具（业务无关通用命名）。 */
const FIELDS: GenFieldDef[] = [
  { name: 'title', label: '标题', type: 'string', required: true, enumOptions: [], inList: true, inForm: true, searchable: true },
  { name: 'detail', label: '详情', type: 'text', required: false, enumOptions: [], inList: false, inForm: true, searchable: true },
  { name: 'quantity', label: '数量', type: 'integer', required: true, enumOptions: [], inList: true, inForm: true, searchable: false },
  { name: 'price', label: '价格', type: 'decimal', required: false, enumOptions: [], inList: true, inForm: true, searchable: false },
  { name: 'archived', label: '归档', type: 'boolean', required: false, enumOptions: [], inList: true, inForm: true, searchable: false },
  { name: 'grade', label: '等级', type: 'enum', required: true, enumOptions: ['a', 'b'], inList: true, inForm: true, searchable: true },
  { name: 'publishedAt', label: '发布时间', type: 'datetime', required: true, enumOptions: [], inList: true, inForm: true, searchable: false },
];
const DEF = { name: 'generic-item', displayName: '通用条目', fields: FIELDS };

describe('生成器渲染（确定性）', () => {
  it('同一输入两次渲染产物逐字节一致', () => {
    const a = renderGenFiles(DEF);
    const b = renderGenFiles(DEF);
    expect(a.map((f) => f.path)).toEqual(b.map((f) => f.path));
    expect(a.map((f) => f.content)).toEqual(b.map((f) => f.content));
  });

  it('产物集合覆盖 contracts/prisma/api 三件/web api/web 页面七件', () => {
    const paths = renderGenFiles(DEF).map((f) => f.path);
    expect(paths).toEqual([
      'packages/contracts/src/generic-item.ts',
      'apps/api/prisma/gen/generic-item.model.prisma',
      'apps/api/src/modules/generic-item/generic-item.service.ts',
      'apps/api/src/modules/generic-item/generic-item.controller.ts',
      'apps/api/src/modules/generic-item/generic-item.module.ts',
      'apps/web/src/api/generic-item.ts',
      'apps/web/src/views/generic-item/index.vue',
    ]);
  });

  it('产物锚点：权限串/路由/类名/字段类型映射逐项落位', () => {
    const byPath = new Map(renderGenFiles(DEF).map((f) => [f.path, f.content]));
    const contracts = byPath.get('packages/contracts/src/generic-item.ts') ?? '';
    // 标识符必须为合法 camelCase（模块名 kebab 不直接进标识符）
    expect(contracts).toContain('export const genericItemItemSchema');
    expect(contracts).toContain('export const genericItemQuerySchema');
    expect(contracts).not.toContain('generic-itemItemSchema');
    expect(contracts).toContain('price: decimalStringSchema.optional(),');
    expect(contracts).toContain("grade: z.enum(['a', 'b']),");
    expect(contracts).toContain('publishedAt: isoDateTimeSchema,');

    const service = byPath.get('apps/api/src/modules/generic-item/generic-item.service.ts') ?? '';
    expect(service).toContain('new Prisma.Decimal(body.price)');
    expect(service).toContain('new Date(body.publishedAt)');
    expect(service).toContain('price: row.price ? row.price.toFixed(2) : null,');
    expect(service).toContain("AppError('NOT_FOUND', '通用条目 not found')");

    const controller = byPath.get('apps/api/src/modules/generic-item/generic-item.controller.ts') ?? '';
    expect(controller).toContain("@Controller('generic-item')");
    expect(controller).toContain("@RequirePermissions('generic-item:list')");
    expect(controller).toContain("@Audit('通用条目', 'insert')");

    const prisma = byPath.get('apps/api/prisma/gen/generic-item.model.prisma') ?? '';
    expect(prisma).toContain('price  Decimal? @db.Decimal(12, 2)');
    expect(prisma).toContain('title  String @db.VarChar(100)');
    expect(prisma).toContain('publishedAt  DateTime');
    expect(prisma).toContain('@@map("generic_item")');

    const page = byPath.get('apps/web/src/views/generic-item/index.vue') ?? '';
    expect(page).toContain('FIELD_OPTIONS.grade');
    expect(page).toContain("v-permission=\"'generic-item:update'\"");
    expect(page).toContain('el-date-picker');
    // 编辑回填：数值可空字段回 undefined（防 '' 进提交链：decimal TypeError / integer 归零）
    expect(page).toContain('price: (row.price === null ? undefined : Number(row.price)) as never,');
    expect(page).toContain('quantity: (row.quantity === null ? undefined : row.quantity) as never,');
    expect(page).toContain("title: (row.title ?? '') as never,");
    // 必填 datetime 有字段级规则（change 触发），漏填不再裸奔到服务端 400
    expect(page).toContain("trigger: 'change'");
  });

  it('产物 import 与审计覆盖：service 不引 controller 专属标识符，remove 单参且落审计', () => {
    const byPath = new Map(renderGenFiles(DEF).map((f) => [f.path, f.content]));
    const service = byPath.get('apps/api/src/modules/generic-item/generic-item.service.ts') ?? '';
    const controller = byPath.get('apps/api/src/modules/generic-item/generic-item.controller.ts') ?? '';
    // schema/idParamSchema 只在 controller 使用，service 引入即 lint 未用告警
    expect(service).not.toContain('idParamSchema');
    expect(service).not.toContain('RequestSchema');
    expect(service).toContain('async remove(id: number): Promise<void>');
    expect(controller).toContain("idParamSchema");
    expect(controller).toContain("@Audit('通用条目', 'delete')");
    expect(controller).toContain('this.genericitem.remove(params.id)');
    expect(controller).not.toContain('.remove(params.id, user.id)');
  });

  it('元数据字符约束：单引号/反斜杠/换行/块注释终止符在请求侧被拒', () => {
    const base = { name: 'valid-name', fields: FIELDS };
    for (const bad of ["it's", 'a\\b', '多\n行', '注释*/终止']) {
      expect(genDefinitionRequestSchema.safeParse({ ...base, displayName: bad }).success).toBe(false);
    }
    expect(
      genDefinitionRequestSchema.safeParse({
        ...base,
        displayName: '合法名称',
        fields: [{ ...FIELDS[0], label: "含引号'" }],
      }).success,
    ).toBe(false);
    expect(
      genDefinitionRequestSchema.safeParse({
        ...base,
        displayName: '合法名称',
        fields: [{ ...FIELDS[5], enumOptions: ["坏\\选项"] }],
      }).success,
    ).toBe(false);
    expect(genDefinitionRequestSchema.safeParse({ ...base, displayName: '通用条目/正常' }).success).toBe(true);
  });
});

describe('CLI 落盘核心（拒绝覆盖 + 幂等确定性）', () => {
  it('首次写入成功；同目录二次写入整体拒绝且列全部冲突文件', async () => {
    const root = await fs.mkdtemp(path.join(tmpdir(), 'tiangong-gen-'));
    const files = renderGenFiles(DEF);
    const written = await writeGeneratedFiles(root, files);
    expect(written).toHaveLength(files.length);

    await expect(writeGeneratedFiles(root, files)).rejects.toThrow(GenOverwriteError);
    const err = (await writeGeneratedFiles(root, files).then(
      () => null,
      (e: unknown) => e,
    )) as GenOverwriteError;
    expect(err.files).toEqual(files.map((f) => f.path));

    // 已存在时必须零写入（不产生半套产物）：拒绝后不应新增任何文件
    const before = await snapshot(root);
    await writeGeneratedFiles(root, files).catch(() => undefined);
    expect(await snapshot(root)).toEqual(before);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('两次独立落盘 diff 为空（端到端确定性）', async () => {
    const rootA = await fs.mkdtemp(path.join(tmpdir(), 'tiangong-gen-a-'));
    const rootB = await fs.mkdtemp(path.join(tmpdir(), 'tiangong-gen-b-'));
    await writeGeneratedFiles(rootA, renderGenFiles(DEF));
    await writeGeneratedFiles(rootB, renderGenFiles(DEF));
    const snapA = await snapshot(rootA);
    const snapB = await snapshot(rootB);
    expect(snapA).toEqual(snapB);
    await fs.rm(rootA, { recursive: true, force: true });
    await fs.rm(rootB, { recursive: true, force: true });
  });
});

async function snapshot(root: string): Promise<Array<{ file: string; content: string }>> {
  const out: Array<{ file: string; content: string }> = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else {
        out.push({ file: path.relative(root, abs), content: await fs.readFile(abs, 'utf8') });
      }
    }
  }
  await walk(root);
  return out.sort((x, y) => x.file.localeCompare(y.file));
}
