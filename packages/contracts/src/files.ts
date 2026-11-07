import { z } from 'zod';
import { isoDateTimeSchema, keywordSchema, pageQuerySchema } from './common.js';

export const fileItemSchema = z.object({
  id: z.number().int(),
  originalName: z.string(),
  suffix: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  storage: z.string(),
  createdBy: z.number().int().nullable(),
  createdAt: isoDateTimeSchema,
});
export type FileItem = z.infer<typeof fileItemSchema>;

export const fileListQuerySchema = pageQuerySchema.extend({
  keyword: keywordSchema,
  suffix: z.string().trim().max(10).optional(),
});
export type FileListQuery = z.infer<typeof fileListQuerySchema>;

/** 上传成功返回。url 为授权下载端点（非直链）。 */
export const uploadResponseSchema = z.object({
  id: z.number().int(),
  url: z.string(),
  originalName: z.string(),
  suffix: z.string(),
  sizeBytes: z.number().int(),
});
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
