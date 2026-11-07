import { z } from 'zod';
import {
  enabledFilterSchema,
  isoDateTimeSchema,
  keywordSchema,
  pageQuerySchema,
} from './common.js';
import { passwordSchema } from './auth.js';

const roleBriefSchema = z.object({
  id: z.number().int(),
  roleKey: z.string(),
  name: z.string(),
});
export type RoleBrief = z.infer<typeof roleBriefSchema>;

export const userItemSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  nickname: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  enabled: z.boolean(),
  remark: z.string().nullable(),
  roles: z.array(roleBriefSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  lastLoginAt: isoDateTimeSchema.nullable(),
});
export type UserItem = z.infer<typeof userItemSchema>;

export const userListQuerySchema = pageQuerySchema.extend({
  keyword: keywordSchema,
  enabled: enabledFilterSchema,
  roleId: z.coerce.number().int().positive().optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const createUserRequestSchema = z.object({
  username: z
    .string()
    .min(3, 'username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'username allows letters, digits and underscore only'),
  nickname: z.string().min(1).max(30),
  password: passwordSchema,
  email: z.string().email().max(100).optional(),
  phone: z.string().max(20).optional(),
  roleIds: z.array(z.number().int().positive()).default([]),
  enabled: z.boolean().default(true),
  remark: z.string().max(500).optional(),
});
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export const updateUserRequestSchema = z.object({
  nickname: z.string().min(1).max(30).optional(),
  email: z.string().email().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  roleIds: z.array(z.number().int().positive()).optional(),
  enabled: z.boolean().optional(),
  remark: z.string().max(500).nullable().optional(),
});
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

/** 管理员重置用户密码。 */
export const resetPasswordRequestSchema = z.object({
  newPassword: passwordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
