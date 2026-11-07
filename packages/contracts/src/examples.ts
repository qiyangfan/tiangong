import { z } from 'zod';
import {
  decimalStringSchema,
  enabledFilterSchema,
  isoDateTimeSchema,
  keywordSchema,
  pageQuerySchema,
} from './common.js';

/**
 * SampleRecord：可复用的通用 CRUD 示范实体（字段刻意业务无关）。
 * 代码生成器以它为参照模板；Web 与小程序读写同一份数据完成跨端闭环。
 */
export const sampleRecordItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  category: z.string().nullable(),
  amount: decimalStringSchema.nullable(),
  enabled: z.boolean(),
  remark: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type SampleRecordItem = z.infer<typeof sampleRecordItemSchema>;

export const sampleRecordQuerySchema = pageQuerySchema.extend({
  keyword: keywordSchema,
  category: z.string().trim().max(50).optional(),
  enabled: enabledFilterSchema,
});
export type SampleRecordQuery = z.infer<typeof sampleRecordQuerySchema>;

export const createSampleRequestSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  amount: decimalStringSchema.optional(),
  enabled: z.boolean().default(true),
  remark: z.string().max(500).optional(),
});
export type CreateSampleRequest = z.infer<typeof createSampleRequestSchema>;

export const updateSampleRequestSchema = createSampleRequestSchema.partial();
export type UpdateSampleRequest = z.infer<typeof updateSampleRequestSchema>;
