import {
  camelCase,
  type GenRenderInput,
  itemFieldLine,
  prismaFieldLine,
  pascalCase,
  requestFieldLine,
  searchableFields,
} from './naming';

/** contracts 包 schema 产物（API 契约唯一来源）。 */
export function renderContracts(def: GenRenderInput): string {
  const pascal = pascalCase(def.name);
  const camel = camelCase(def.name);
  const item = `${camel}Item`;
  const query = `${camel}Query`;
  const searchLines = searchableFields(def.fields)
    .map((f) => `  /** like 匹配 */\n  ${f.name}: keywordSchema,`)
    .join('\n');
  const needsDecimal = def.fields.some((f) => f.type === 'decimal');
  const decimalImport = needsDecimal ? ',\n  decimalStringSchema,' : '';

  return `import { z } from 'zod';
import {
  isoDateTimeSchema,
  keywordSchema,
  pageQuerySchema,${decimalImport}
} from './common.js';

/** ${pascal}：由代码生成器按 gen_definition 元数据生成，字段口径以元数据为准。 */
export const ${item}Schema = z.object({
  id: z.number().int(),
${def.fields.map(itemFieldLine).join('\n')}
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type ${pascal}Item = z.infer<typeof ${item}Schema>;

export const ${query}Schema = pageQuerySchema.extend({
  keyword: keywordSchema,
${searchLines}
});
export type ${pascal}Query = z.infer<typeof ${query}Schema>;

export const create${pascal}RequestSchema = z.object({
${def.fields.map(requestFieldLine).join('\n')}
});
export type Create${pascal}Request = z.infer<typeof create${pascal}RequestSchema>;

export const update${pascal}RequestSchema = create${pascal}RequestSchema.partial();
export type Update${pascal}Request = z.infer<typeof update${pascal}RequestSchema>;
`;
}

/** Prisma model 片段产物（人工合并进 schema.prisma 后执行 migrate）。 */
export function renderPrisma(def: GenRenderInput): string {
  const pascal = pascalCase(def.name);
  return `// 生成器产物：${def.displayName}（合并进 apps/api/prisma/schema.prisma 后执行 prisma migrate dev）
model ${pascal} {
  id        Int      @id @default(autoincrement())
${def.fields.map(prismaFieldLine).join('\n')}
  createdBy Int?     @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  updatedBy Int?     @map("updated_by")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("${def.name.replace(/-/g, '_')}")
}
`;
}
