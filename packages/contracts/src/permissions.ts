import { z } from 'zod';
import { keywordSchema } from './common.js';

export const permissionItemSchema = z.object({
  id: z.number().int(),
  resource: z.string(),
  action: z.string(),
  name: z.string(),
  remark: z.string().nullable(),
});
export type PermissionItem = z.infer<typeof permissionItemSchema>;

/** 权限点全量列表（系统规模小，不分页；按 resource 分组供前端勾选）。 */
export const permissionListQuerySchema = z.object({
  keyword: keywordSchema,
});
export type PermissionListQuery = z.infer<typeof permissionListQuerySchema>;

export const permissionGroupSchema = z.object({
  resource: z.string(),
  name: z.string(),
  permissions: z.array(permissionItemSchema),
});
export type PermissionGroup = z.infer<typeof permissionGroupSchema>;

export const createPermissionRequestSchema = z.object({
  resource: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z][a-z0-9-]*$/, 'resource must be lower kebab-case'),
  action: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z][a-z0-9-]*$/, 'action must be lower kebab-case'),
  name: z.string().min(1).max(100),
  remark: z.string().max(500).optional(),
});
export type CreatePermissionRequest = z.infer<typeof createPermissionRequestSchema>;

export const updatePermissionRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  remark: z.string().max(500).nullable().optional(),
});
export type UpdatePermissionRequest = z.infer<typeof updatePermissionRequestSchema>;
