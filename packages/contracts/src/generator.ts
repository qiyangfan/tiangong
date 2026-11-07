import { z } from 'zod';
import { isoDateTimeSchema, keywordSchema } from './common.js';

/** 生成器支持的字段类型（决定表单控件与 Prisma 列类型映射）。 */
export const genFieldTypeSchema = z.enum([
  'string',
  'text',
  'integer',
  'decimal',
  'boolean',
  'enum',
  'datetime',
]);
export type GenFieldType = z.infer<typeof genFieldTypeSchema>;

export const genFieldDefSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z][a-zA-Z0-9]*$/, 'field name must be lower camelCase'),
  label: z.string().min(1).max(50),
  type: genFieldTypeSchema,
  required: z.boolean().default(false),
  enumOptions: z.array(z.string().min(1).max(50)).default([]),
  inList: z.boolean().default(true),
  inForm: z.boolean().default(true),
  searchable: z.boolean().default(false),
});
export type GenFieldDef = z.infer<typeof genFieldDefSchema>;

/** 代码生成元数据定义（存库；渲染为确定性模板产物）。 */
export const genDefinitionItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  displayName: z.string(),
  fields: z.array(genFieldDefSchema),
  remark: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type GenDefinitionItem = z.infer<typeof genDefinitionItemSchema>;

export const genDefinitionListQuerySchema = z.object({
  keyword: keywordSchema,
});
export type GenDefinitionListQuery = z.infer<typeof genDefinitionListQuerySchema>;

export const genDefinitionRequestSchema = z.object({
  /** 模块名：kebab-case，作为目录名与路由段 */
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z][a-z0-9-]*$/, 'module name must be kebab-case'),
  displayName: z.string().min(1).max(50),
  fields: z.array(genFieldDefSchema).min(1),
  remark: z.string().max(500).optional(),
});
export type GenDefinitionRequest = z.infer<typeof genDefinitionRequestSchema>;

export const genDefinitionUpdateSchema = genDefinitionRequestSchema.partial();
export type GenDefinitionUpdate = z.infer<typeof genDefinitionUpdateSchema>;

/** 预览产物：相对仓库根的文件路径 + 完整内容。 */
export const genPreviewFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});
export type GenPreviewFile = z.infer<typeof genPreviewFileSchema>;
