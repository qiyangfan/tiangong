import { z } from 'zod';
import {
  enabledFilterSchema,
  isoDateTimeSchema,
  keywordSchema,
  pageQuerySchema,
} from './common.js';

export const tagTypeSchema = z.enum(['primary', 'success', 'info', 'warning', 'danger']);
export type TagType = z.infer<typeof tagTypeSchema>;

export const dictTypeItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  dictKey: z.string(),
  enabled: z.boolean(),
  remark: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type DictTypeItem = z.infer<typeof dictTypeItemSchema>;

export const dictTypeListQuerySchema = pageQuerySchema.extend({
  keyword: keywordSchema,
  enabled: enabledFilterSchema,
});
export type DictTypeListQuery = z.infer<typeof dictTypeListQuerySchema>;

export const createDictTypeRequestSchema = z.object({
  name: z.string().min(1).max(100),
  dictKey: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, 'dict key must be lower snake_case'),
  enabled: z.boolean().default(true),
  remark: z.string().max(500).optional(),
});
export type CreateDictTypeRequest = z.infer<typeof createDictTypeRequestSchema>;

export const updateDictTypeRequestSchema = createDictTypeRequestSchema.partial();
export type UpdateDictTypeRequest = z.infer<typeof updateDictTypeRequestSchema>;

export const dictItemSchema = z.object({
  id: z.number().int(),
  dictKey: z.string(),
  label: z.string(),
  value: z.string(),
  tagType: tagTypeSchema.nullable(),
  sort: z.number().int(),
  isDefault: z.boolean(),
  enabled: z.boolean(),
  remark: z.string().nullable(),
});
export type DictItem = z.infer<typeof dictItemSchema>;

/** 某一字典类型下的全部可用项（useDict 消费的形态）。 */
export const dictOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  tagType: tagTypeSchema.nullable(),
});
export type DictOption = z.infer<typeof dictOptionSchema>;

export const dictItemListQuerySchema = z.object({
  dictKey: z.string().min(1).max(100),
  enabled: enabledFilterSchema,
});
export type DictItemListQuery = z.infer<typeof dictItemListQuerySchema>;

export const createDictItemRequestSchema = z.object({
  dictKey: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  tagType: tagTypeSchema.nullable().default(null),
  sort: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  enabled: z.boolean().default(true),
  remark: z.string().max(500).optional(),
});
export type CreateDictItemRequest = z.infer<typeof createDictItemRequestSchema>;

export const updateDictItemRequestSchema = createDictItemRequestSchema.partial();
export type UpdateDictItemRequest = z.infer<typeof updateDictItemRequestSchema>;
