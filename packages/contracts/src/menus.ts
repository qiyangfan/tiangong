import { z } from 'zod';
import { isoDateTimeSchema } from './common.js';

export const menuTypeSchema = z.enum(['M', 'C', 'F']);
export type MenuType = z.infer<typeof menuTypeSchema>;

/** 菜单树节点（M 目录 / C 菜单 / F 按钮；perms 仅用于前端按钮显隐，API 鉴权只认 Permission）。 */
export interface MenuNode {
  id: number;
  parentId: number;
  name: string;
  menuType: MenuType;
  path: string | null;
  component: string | null;
  perms: string | null;
  icon: string | null;
  sort: number;
  visible: boolean;
  enabled: boolean;
  children: MenuNode[];
}

const menuNodeFields = {
  id: z.number().int(),
  parentId: z.number().int(),
  name: z.string(),
  menuType: menuTypeSchema,
  path: z.string().nullable(),
  component: z.string().nullable(),
  perms: z.string().nullable(),
  icon: z.string().nullable(),
  sort: z.number().int(),
  visible: z.boolean(),
  enabled: z.boolean(),
  children: z.array(z.lazy(() => menuNodeSchema)),
};

export const menuNodeSchema: z.ZodType<MenuNode> = z.object(menuNodeFields);

/** 菜单管理列表返回全量树（带元信息）。 */
export interface MenuNodeWithMeta extends MenuNode {
  createdAt: string;
  updatedAt: string;
  remark: string | null;
}

export const menuNodeWithMetaSchema: z.ZodType<MenuNodeWithMeta> = z.object({
  ...menuNodeFields,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  remark: z.string().nullable(),
});

/** 当前用户可见的导航树（服务端按角色权限过滤后下发）。 */
export type UserMenus = MenuNode[];

/** 全量菜单树（管理端）。 */
export type MenuTree = MenuNode[];

export const createMenuRequestSchema = z.object({
  parentId: z.number().int().min(0).default(0),
  name: z.string().min(1).max(50),
  menuType: menuTypeSchema,
  path: z.string().max(200).optional(),
  component: z.string().max(255).optional(),
  perms: z.string().max(100).optional(),
  icon: z.string().max(100).optional(),
  sort: z.number().int().min(0).default(0),
  visible: z.boolean().default(true),
  enabled: z.boolean().default(true),
  remark: z.string().max(500).optional(),
});
export type CreateMenuRequest = z.infer<typeof createMenuRequestSchema>;

export const updateMenuRequestSchema = createMenuRequestSchema.partial();
export type UpdateMenuRequest = z.infer<typeof updateMenuRequestSchema>;
