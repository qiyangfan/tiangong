import { z } from 'zod';
import {
  enabledFilterSchema,
  isoDateTimeSchema,
  keywordSchema,
  pageQuerySchema,
} from './common.js';

export const roleItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  roleKey: z.string(),
  sort: z.number().int(),
  enabled: z.boolean(),
  builtin: z.boolean(),
  remark: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type RoleItem = z.infer<typeof roleItemSchema>;

/** 角色详情：含权限点集合（resource:action）。 */
export const roleDetailSchema = roleItemSchema.extend({
  permissions: z.array(z.string()),
});
export type RoleDetail = z.infer<typeof roleDetailSchema>;

export const roleListQuerySchema = pageQuerySchema.extend({
  keyword: keywordSchema,
  enabled: enabledFilterSchema,
});
export type RoleListQuery = z.infer<typeof roleListQuerySchema>;

export const createRoleRequestSchema = z.object({
  name: z.string().min(1).max(30),
  roleKey: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, 'role key must be lower snake_case'),
  sort: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
  remark: z.string().max(500).optional(),
  permissionIds: z.array(z.number().int().positive()).default([]),
});
export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>;

export const updateRoleRequestSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  roleKey: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .optional(),
  sort: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
  remark: z.string().max(500).nullable().optional(),
  permissionIds: z.array(z.number().int().positive()).optional(),
});
export type UpdateRoleRequest = z.infer<typeof updateRoleRequestSchema>;
