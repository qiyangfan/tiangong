import {
  type CreatePermissionRequest,
  createPermissionRequestSchema,
  idParamSchema,
  type PermissionGroup,
  type PermissionItem,
  type PermissionListQuery,
  permissionListQuerySchema,
  type UpdatePermissionRequest,
  updatePermissionRequestSchema,
} from '@tiangong/contracts';
import { Body, Controller, Delete, Get, Param, Put, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Audit } from '../../common/audit/audit.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { PermissionsService } from './permissions.service';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @RequirePermissions('system:permission:list')
  @ApiOperation({ summary: '权限点分组列表' })
  async list(
    @Query(new ZodValidationPipe(permissionListQuerySchema)) query: PermissionListQuery,
  ): Promise<PermissionGroup[]> {
    return this.permissions.listGrouped(query.keyword);
  }

  @Post()
  @RequirePermissions('system:permission:create')
  @Audit('权限管理', 'insert')
  @ApiOperation({ summary: '新增权限点' })
  async create(
    @Body(new ZodValidationPipe(createPermissionRequestSchema)) body: CreatePermissionRequest,
  ): Promise<PermissionItem> {
    return this.permissions.create(body);
  }

  @Put(':id')
  @RequirePermissions('system:permission:update')
  @Audit('权限管理', 'update')
  @ApiOperation({ summary: '修改权限点' })
  async update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(updatePermissionRequestSchema)) body: UpdatePermissionRequest,
  ): Promise<PermissionItem> {
    return this.permissions.update(params.id, body);
  }

  @Delete(':id')
  @RequirePermissions('system:permission:delete')
  @Audit('权限管理', 'delete')
  @ApiOperation({ summary: '删除权限点' })
  async remove(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }): Promise<void> {
    await this.permissions.remove(params.id);
  }
}
