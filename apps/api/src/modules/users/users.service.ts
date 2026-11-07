import {
  type CreateUserRequest,
  type PageResult,
  type ResetPasswordRequest,
  type UpdateUserRequest,
  type UserItem,
  type UserListQuery,
} from '@tiangong/contracts';
import { hash } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { pageBounds, pageResult } from '../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

type UserWithRoles = User & {
  roles: Array<{ role: { id: number; roleKey: string; name: string } }>;
};

/** 用户管理：CRUD、启停、重置密码、角色分配；禁止自删/自停用。 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: UserListQuery): Promise<PageResult<UserItem>> {
    const where: Prisma.UserWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { username: { contains: query.keyword } },
              { nickname: { contains: query.keyword } },
            ],
          }
        : {}),
      ...(query.enabled === undefined ? {} : { enabled: query.enabled }),
      ...(query.roleId === undefined ? {} : { roles: { some: { roleId: query.roleId } } }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { roles: { include: { role: true } } },
        orderBy: { id: 'asc' },
        ...pageBounds(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return pageResult(rows.map(toItem), total, query);
  }

  async detail(id: number): Promise<UserItem> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new AppError('USER_NOT_FOUND');
    }
    return toItem(user);
  }

  async create(body: CreateUserRequest, userId: number): Promise<UserItem> {
    await this.assertUsernameFree(body.username);
    if (body.email) {
      await this.assertEmailFree(body.email);
    }
    await this.assertRolesExist(body.roleIds);
    const created = await this.prisma.user.create({
      data: {
        username: body.username,
        nickname: body.nickname,
        email: body.email,
        phone: body.phone,
        passwordHash: await hash(body.password),
        enabled: body.enabled,
        remark: body.remark,
        createdBy: userId,
        roles: { create: body.roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { include: { role: true } } },
    });
    return toItem(created);
  }

  async update(id: number, body: UpdateUserRequest, userId: number): Promise<UserItem> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('USER_NOT_FOUND');
    }
    if (body.email) {
      await this.assertEmailFree(body.email, id);
    }
    if (body.roleIds) {
      await this.assertRolesExist(body.roleIds);
    }
    if (body.enabled === false && id === userId) {
      throw new AppError('CONFLICT', 'cannot disable yourself');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: body.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
      const { roleIds: _omit, ...data } = body;
      return tx.user.update({
        where: { id },
        data: { ...data, updatedBy: userId },
        include: { roles: { include: { role: true } } },
      });
    });
    return toItem(updated);
  }

  async remove(id: number, userId: number): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('USER_NOT_FOUND');
    }
    if (id === userId) {
      throw new AppError('CONFLICT', 'cannot delete yourself');
    }
    await this.prisma.user.delete({ where: { id } });
  }

  async resetPassword(id: number, body: ResetPasswordRequest, userId: number): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('USER_NOT_FOUND');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash: await hash(body.newPassword), updatedBy: userId },
      }),
      // 密码重置后吊销该用户全部会话
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async setEnabled(id: number, enabled: boolean, userId: number): Promise<UserItem> {
    if (!enabled && id === userId) {
      throw new AppError('CONFLICT', 'cannot disable yourself');
    }
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('USER_NOT_FOUND');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { enabled, updatedBy: userId },
      include: { roles: { include: { role: true } } },
    });
    return toItem(updated);
  }

  private async assertUsernameFree(username: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) {
      throw new AppError('USER_USERNAME_TAKEN');
    }
  }

  private async assertEmailFree(email: string, excludeId?: number): Promise<void> {
    const exists = await this.prisma.user.findFirst({ where: { email, NOT: { id: excludeId } } });
    if (exists) {
      throw new AppError('USER_EMAIL_TAKEN');
    }
  }

  private async assertRolesExist(roleIds: number[]): Promise<void> {
    if (roleIds.length === 0) {
      return;
    }
    const found = await this.prisma.role.count({ where: { id: { in: roleIds } } });
    if (found !== roleIds.length) {
      throw new AppError('ROLE_NOT_FOUND', 'some roles do not exist');
    }
  }
}

function toItem(user: UserWithRoles): UserItem {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    enabled: user.enabled,
    remark: user.remark,
    roles: user.roles.map((ur) => ({
      id: ur.role.id,
      roleKey: ur.role.roleKey,
      name: ur.role.name,
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}
