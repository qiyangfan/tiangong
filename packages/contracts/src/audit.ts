import { z } from 'zod';
import { isoDateTimeSchema, keywordSchema, pageQuerySchema } from './common.js';

export const businessTypeSchema = z.enum([
  'insert',
  'update',
  'delete',
  'grant',
  'export',
  'import',
  'other',
]);
export type BusinessType = z.infer<typeof businessTypeSchema>;

export const operStatusSchema = z.enum(['ok', 'error']);
export type OperStatus = z.infer<typeof operStatusSchema>;

/** 操作审计（@Audit 装饰器采集，参数与结果已截断脱敏）。 */
export const operLogItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  businessType: businessTypeSchema,
  method: z.string(),
  requestMethod: z.string(),
  requestPath: z.string(),
  userId: z.number().int().nullable(),
  username: z.string(),
  client: z.string(),
  ip: z.string(),
  params: z.string().nullable(),
  result: z.string().nullable(),
  status: operStatusSchema,
  errorMsg: z.string().nullable(),
  costMs: z.number().int(),
  requestId: z.string(),
  operatedAt: isoDateTimeSchema,
});
export type OperLogItem = z.infer<typeof operLogItemSchema>;

export const operLogQuerySchema = pageQuerySchema.extend({
  keyword: keywordSchema,
  username: z.string().trim().max(50).optional(),
  status: operStatusSchema.optional(),
  businessType: businessTypeSchema.optional(),
});
export type OperLogQuery = z.infer<typeof operLogQuerySchema>;

/** 登录审计。 */
export const loginLogItemSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  userId: z.number().int().nullable(),
  client: z.string(),
  ip: z.string(),
  status: operStatusSchema,
  message: z.string().nullable(),
  requestId: z.string(),
  loggedAt: isoDateTimeSchema,
});
export type LoginLogItem = z.infer<typeof loginLogItemSchema>;

export const loginLogQuerySchema = pageQuerySchema.extend({
  keyword: keywordSchema,
  username: z.string().trim().max(50).optional(),
  status: operStatusSchema.optional(),
});
export type LoginLogQuery = z.infer<typeof loginLogQuerySchema>;
