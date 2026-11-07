import {
  type CreateRoleRequest,
  type PageResult,
  type RoleDetail,
  type RoleItem,
  type RoleListQuery,
  type UpdateRoleRequest,
} from '@tiangong/contracts';
import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { pageBounds, pageResult } from '../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

/** 角色管理：RBAC 角色 CRUD 与权限点绑定；内置角色保护。 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: RoleListQuery): Promise<PageResult<RoleItem>> {
    const where: Prisma.RoleWhereInput = {
      ...(query.keyword
        ? { OR: [{ name: { contains: query.keyword } }, { roleKey: { contains: query.keyword } }] }
        : {}),
      ...(query.enabled === undefined ? {} : { enabled: query.enabled }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({ where, orderBy: { sort: 'asc' }, ...pageBounds(query) }),
      this.prisma.role.count({ where }),
    ]);
    return pageResult(rows.map(toItem), total, query);
  }

  async detail(id: number): Promise<RoleDetail> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new AppError('ROLE_NOT_FOUND');
    }
    return {
      ...toItem(role),
      permissions: role.permissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
    };
  }

  async create(body: CreateRoleRequest, userId: number): Promise<RoleItem> {
    const exists = await this.prisma.role.findUnique({ where: { roleKey: body.roleKey } });
    if (exists) {
      throw new AppError('ROLE_KEY_TAKEN');
    }
    await this.assertPermissionsExist(body.permissionIds);
    const role = await this.prisma.role.create({
      data: {
        name: body.name,
        roleKey: body.roleKey,
        sort: body.sort,
        enabled: body.enabled,
        remark: body.remark,
        createdBy: userId,
        permissions: { create: body.permissionIds.map((permissionId) => ({ permissionId })) },
      },
    });
    return toItem(role);
  }

  async update(id: number, body: UpdateRoleRequest, userId: number): Promise<RoleItem> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('ROLE_NOT_FOUND');
    }
    if (existing.builtin && body.roleKey !== undefined && body.roleKey !== existing.roleKey) {
      throw new AppError('ROLE_BUILTIN_UNASSIGNABLE', 'built-in role key is immutable');
    }
    if (body.roleKey && body.roleKey !== existing.roleKey) {
      const taken = await this.prisma.role.findUnique({ where: { roleKey: body.roleKey } });
      if (taken) {
        throw new AppError('ROLE_KEY_TAKEN');
      }
    }
    if (body.permissionIds) {
      await this.assertPermissionsExist(body.permissionIds);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: body.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
      const { permissionIds: _omit, ...data } = body;
      return tx.role.update({ where: { id }, data: { ...data, updatedBy: userId } });
    });
    return toItem(updated);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('ROLE_NOT_FOUND');
    }
    if (existing.builtin) {
      throw new AppError('ROLE_BUILTIN_UNASSIGNABLE', 'built-in role cannot be deleted');
    }
    await this.prisma.role.delete({ where: { id } });
  }

  private async assertPermissionsExist(permissionIds: number[]): Promise<void> {
    if (permissionIds.length === 0) {
      return;
    }
    const found = await this.prisma.permission.count({ where: { id: { in: permissionIds } } });
    if (found !== permissionIds.length) {
      throw new AppError('PERMISSION_NOT_FOUND', 'some permissions do not exist');
    }
  }
}

function toItem(role: Role): RoleItem {
  return {
    id: role.id,
    name: role.name,
    roleKey: role.roleKey,
    sort: role.sort,
    enabled: role.enabled,
    builtin: role.builtin,
    remark: role.remark,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}
