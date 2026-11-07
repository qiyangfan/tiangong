import {
  type CreatePermissionRequest,
  type PermissionGroup,
  type PermissionItem,
  type UpdatePermissionRequest,
} from '@tiangong/contracts';
import { Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';

/** 权限点管理：resource:action 登记（供角色绑定）。 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listGrouped(keyword?: string): Promise<PermissionGroup[]> {
    const rows = await this.prisma.permission.findMany({
      where: keyword
        ? {
            OR: [
              { resource: { contains: keyword } },
              { action: { contains: keyword } },
              { name: { contains: keyword } },
            ],
          }
        : undefined,
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
    const groups = new Map<string, PermissionGroup>();
    for (const row of rows) {
      const group = groups.get(row.resource) ?? {
        resource: row.resource,
        name: resourceLabel(row.resource),
        permissions: [],
      };
      group.permissions.push(toItem(row));
      groups.set(row.resource, group);
    }
    return [...groups.values()];
  }

  async create(body: CreatePermissionRequest): Promise<PermissionItem> {
    const exists = await this.prisma.permission.findUnique({
      where: { resource_action: { resource: body.resource, action: body.action } },
    });
    if (exists) {
      throw new AppError('PERMISSION_TAKEN');
    }
    const row = await this.prisma.permission.create({ data: body });
    return toItem(row);
  }

  async update(id: number, body: UpdatePermissionRequest): Promise<PermissionItem> {
    const existing = await this.prisma.permission.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('PERMISSION_NOT_FOUND');
    }
    const row = await this.prisma.permission.update({ where: { id }, data: body });
    return toItem(row);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.permission.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('PERMISSION_NOT_FOUND');
    }
    await this.prisma.permission.delete({ where: { id } });
  }
}

function toItem(row: Permission): PermissionItem {
  return {
    id: row.id,
    resource: row.resource,
    action: row.action,
    name: row.name,
    remark: row.remark,
  };
}

/** 分组展示名直接用 resource 原文（前端按需本地化）。 */
function resourceLabel(resource: string): string {
  return resource;
}
