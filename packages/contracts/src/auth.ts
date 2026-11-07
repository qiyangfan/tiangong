import { z } from 'zod';
import { clientSchema, isoDateTimeSchema } from './common.js';

/** 密码复杂度：>=8 位且同时含字母与数字（服务端强校验，两端共用）。 */
export const passwordSchema = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .max(72)
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), {
    message: 'password must contain letters and digits',
  });

/** 登录请求。client 决定 refresh token 的载体：web→HttpOnly Cookie，miniapp→响应体。 */
export const loginRequestSchema = z.object({
  username: z.string().min(1).max(30),
  password: z.string().min(1).max(72),
  client: clientSchema,
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** 登录后的当前用户信息（不含任何敏感字段）。 */
export const currentUserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  nickname: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;

/** 当前用户权限串集合（页面刷新经 refresh 恢复会话后，前端重建权限上下文用）。 */
export const userPermissionsSchema = z.object({ permissions: z.array(z.string()) });
export type UserPermissions = z.infer<typeof userPermissionsSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  accessExpiresIn: z.number().int(),
  /** 仅 miniapp 客户端返回；web 端经 HttpOnly Cookie 下发 */
  refreshToken: z.string().optional(),
  user: currentUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** 刷新 access token。web 端从 Cookie 读，miniapp 端从 body 传。 */
export const refreshRequestSchema = z.object({
  refreshToken: z.string().optional(),
  client: clientSchema,
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  accessExpiresIn: z.number().int(),
  refreshToken: z.string().optional(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const logoutRequestSchema = z.object({
  client: clientSchema,
});
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;

/** 修改自己的密码。 */
export const changePasswordRequestSchema = z.object({
  oldPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

/** 更新个人资料。 */
export const updateProfileRequestSchema = z.object({
  nickname: z.string().min(1).max(30).optional(),
  email: z.string().email().max(100).optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const profileSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  nickname: z.string(),
  email: z.string().nullable(),
  avatarFileId: z.number().int().nullable(),
  createdAt: isoDateTimeSchema,
  lastLoginAt: isoDateTimeSchema.nullable(),
});
export type Profile = z.infer<typeof profileSchema>;
