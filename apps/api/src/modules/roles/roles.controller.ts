import {
  type CreateRoleRequest,
  createRoleRequestSchema,
  idParamSchema,
  type RoleDetail,
  type RoleItem,
  type RoleListQuery,
  roleListQuerySchema,
  type UpdateRoleRequest,
  updateRoleRequestSchema,
} from '@tiangong/contracts';
import { Body, Controller, Delete, Get, Param, Put, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions('system:role:list')
  @ApiOperation({ summary: '角色分页列表' })
  async list(@Query(new ZodValidationPipe(roleListQuerySchema)) query: RoleListQuery) {
    return this.roles.list(query);
  }

  @Get(':id')
  @RequirePermissions('system:role:detail')
  @ApiOperation({ summary: '角色详情（含权限点）' })
  async detail(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
  ): Promise<RoleDetail> {
    return this.roles.detail(params.id);
  }

  @Post()
  @RequirePermissions('system:role:create')
  @Audit('角色管理', 'insert')
  @ApiOperation({ summary: '新增角色' })
  async create(
    @Body(new ZodValidationPipe(createRoleRequestSchema)) body: CreateRoleRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoleItem> {
    return this.roles.create(body, user.id);
  }

  @Put(':id')
  @RequirePermissions('system:role:update')
  @Audit('角色管理', 'grant')
  @ApiOperation({ summary: '修改角色（含权限绑定）' })
  async update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(updateRoleRequestSchema)) body: UpdateRoleRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoleItem> {
    return this.roles.update(params.id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions('system:role:delete')
  @Audit('角色管理', 'delete')
  @ApiOperation({ summary: '删除角色' })
  async remove(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }): Promise<void> {
    await this.roles.remove(params.id);
  }
}
