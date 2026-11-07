import { z } from 'zod';
import { isoDateTimeSchema, keywordSchema } from './common.js';

/** 非机密运行参数。禁止存放任何密钥/密码类内容（服务端校验拒绝）。 */
export const settingItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  settingKey: z.string(),
  value: z.string(),
  builtin: z.boolean(),
  remark: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type SettingItem = z.infer<typeof settingItemSchema>;

export const settingListQuerySchema = z.object({
  keyword: keywordSchema,
});
export type SettingListQuery = z.infer<typeof settingListQuerySchema>;

export const createSettingRequestSchema = z.object({
  name: z.string().min(1).max(100),
  settingKey: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z][a-z0-9._-]*$/, 'setting key must be lower dot/kebab-case'),
  value: z.string().min(1).max(500),
  remark: z.string().max(500).optional(),
});
export type CreateSettingRequest = z.infer<typeof createSettingRequestSchema>;

export const updateSettingRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  value: z.string().min(1).max(500).optional(),
  remark: z.string().max(500).nullable().optional(),
});
export type UpdateSettingRequest = z.infer<typeof updateSettingRequestSchema>;
