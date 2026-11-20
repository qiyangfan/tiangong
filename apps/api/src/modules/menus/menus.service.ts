import {
  type CreateMenuRequest,
  type MenuNode,
  type MenuNodeWithMeta,
  type UpdateMenuRequest,
  type UserMenus,
} from '@tiangong/contracts';
import { Injectable } from '@nestjs/common';
import { Menu } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { defined } from '../../common/defined';
import { PrismaService } from '../../prisma/prisma.service';

type MenuRow = Menu;

function isPermitted(perms: string | null, permissions: string[]): boolean {
  if (!perms) {
    return true;
  }
  return permissions.includes('*:*:*') || permissions.includes(perms);
}

function isMenuVisible(menu: MenuRow, permissions: string[]): boolean {
  if (menu.menuType === 'M') {
    return true;
  }
  return menu.visible && isPermitted(menu.perms, permissions);
}

function collectKeepIds(visible: MenuRow[]): Set<number> {
  const keep = new Set<number>();
  for (const m of visible) {
    if (m.menuType !== 'M') {
      keep.add(m.id);
      keep.add(m.parentId);
    }
  }
  return keep;
}

/** 目录链向上冒泡保留（只保留仍含可见子节点的目录）。 */
function bubbleParentIds(keep: Set<number>, byId: Map<number, MenuRow>): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...keep]) {
      const node = byId.get(id);
      if (node && node.parentId !== 0 && !keep.has(node.parentId)) {
        keep.add(node.parentId);
        changed = true;
      }
    }
  }
}

/** 菜单服务：树组装、按权限过滤的用户导航树、CRUD（防环）。 */
@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  /** 全量菜单树（管理端）。 */
  async tree(): Promise<MenuNodeWithMeta[]> {
    const rows = await this.prisma.menu.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
    return this.assembleWithMeta(rows);
  }

  /** 当前用户导航树：C/F 按权限过滤，目录仅保留有可见子节点者；超管直通。 */
  async userMenuTree(permissions: string[]): Promise<UserMenus> {
    const rows = await this.prisma.menu.findMany({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    const visible = rows.filter((m) => isMenuVisible(m, permissions));
    const keep = collectKeepIds(visible);
    const byId = new Map(rows.map((m) => [m.id, m]));
    bubbleParentIds(keep, byId);
    const filtered = visible.filter((m) => keep.has(m.id));
    return this.assemble(filtered);
  }

  async create(body: CreateMenuRequest, userId: number): Promise<MenuNodeWithMeta> {
    await this.assertParentOk(body.parentId, null);
    const row = await this.prisma.menu.create({ data: defined({ ...body, createdBy: userId }) });
    return this.withMeta(row);
  }

  async update(id: number, body: UpdateMenuRequest, userId: number): Promise<MenuNodeWithMeta> {
    const existing = await this.prisma.menu.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('MENU_NOT_FOUND');
    }
    if (body.parentId !== undefined && body.parentId !== existing.parentId) {
      await this.assertParentOk(body.parentId, id);
    }
    const row = await this.prisma.menu.update({
      where: { id },
      data: defined({ ...body, updatedBy: userId }),
    });
    return this.withMeta(row);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.menu.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('MENU_NOT_FOUND');
    }
    const child = await this.prisma.menu.findFirst({ where: { parentId: id } });
    if (child) {
      throw new AppError('MENU_CYCLE', 'menu has children; delete them first');
    }
    await this.prisma.menu.delete({ where: { id } });
  }

  private async assertParentOk(parentId: number, selfId: number | null): Promise<void> {
    if (parentId === 0) {
      return;
    }
    const parent = await this.findParent(parentId);
    if (selfId !== null) {
      await this.assertNoCycle(parent, selfId);
    }
  }

  private async findParent(parentId: number): Promise<MenuRow> {
    const parent = await this.prisma.menu.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw new AppError('MENU_NOT_FOUND', 'parent menu not found');
    }
    return parent;
  }

  /** 沿父链上溯，出现自身即成环。 */
  private async assertNoCycle(start: MenuRow, selfId: number): Promise<void> {
    let cursor: MenuRow | null = start;
    while (cursor) {
      if (cursor.id === selfId) {
        throw new AppError('MENU_CYCLE');
      }
      cursor = await this.nextParent(cursor);
    }
  }

  private async nextParent(row: MenuRow): Promise<MenuRow | null> {
    return row.parentId === 0 ? null : this.prisma.menu.findUnique({ where: { id: row.parentId } });
  }

  private assemble(rows: MenuRow[]): MenuNode[] {
    const nodes = new Map<number, MenuNode>();
    for (const row of rows) {
      nodes.set(row.id, this.toNode(row));
    }
    const roots: MenuNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentId === 0 || !nodes.has(node.parentId)) {
        roots.push(node);
      } else {
        const parent = nodes.get(node.parentId);
        parent?.children.push(node);
      }
    }
    return roots;
  }

  private assembleWithMeta(rows: MenuRow[]): MenuNodeWithMeta[] {
    const nodes = new Map<number, MenuNodeWithMeta>();
    for (const row of rows) {
      nodes.set(row.id, this.withMeta(row));
    }
    const roots: MenuNodeWithMeta[] = [];
    for (const node of nodes.values()) {
      if (node.parentId === 0 || !nodes.has(node.parentId)) {
        roots.push(node);
      } else {
        const parent = nodes.get(node.parentId);
        parent?.children.push(node);
      }
    }
    return roots;
  }

  private toNode(row: MenuRow): MenuNode {
    return {
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      menuType: row.menuType as MenuNode['menuType'],
      path: row.path,
      component: row.component,
      perms: row.perms,
      icon: row.icon,
      sort: row.sort,
      visible: row.visible,
      enabled: row.enabled,
      children: [],
    };
  }

  private withMeta(row: MenuRow): MenuNodeWithMeta {
    return {
      ...this.toNode(row),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      remark: row.remark,
      children: [],
    };
  }
}
