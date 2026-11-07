import {
  type CreateUserRequest,
  createUserRequestSchema,
  idParamSchema,
  type ResetPasswordRequest,
  resetPasswordRequestSchema,
  type UpdateUserRequest,
  updateUserRequestSchema,
  type UserItem,
  type UserListQuery,
  userListQuerySchema,
} from '@tiangong/contracts';
import { Body, Controller, Delete, Get, Param, Put, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('system:user:list')
  @ApiOperation({ summary: '用户分页列表' })
  async list(@Query(new ZodValidationPipe(userListQuerySchema)) query: UserListQuery) {
    return this.users.list(query);
  }

  @Get(':id')
  @RequirePermissions('system:user:detail')
  @ApiOperation({ summary: '用户详情' })
  async detail(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
  ): Promise<UserItem> {
    return this.users.detail(params.id);
  }

  @Post()
  @RequirePermissions('system:user:create')
  @Audit('用户管理', 'insert')
  @ApiOperation({ summary: '新增用户' })
  async create(
    @Body(new ZodValidationPipe(createUserRequestSchema)) body: CreateUserRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserItem> {
    return this.users.create(body, user.id);
  }

  @Put(':id')
  @RequirePermissions('system:user:update')
  @Audit('用户管理', 'update')
  @ApiOperation({ summary: '修改用户（含角色分配）' })
  async update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(updateUserRequestSchema)) body: UpdateUserRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserItem> {
    return this.users.update(params.id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions('system:user:delete')
  @Audit('用户管理', 'delete')
  @ApiOperation({ summary: '删除用户' })
  async remove(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.users.remove(params.id, user.id);
  }

  @Post(':id/reset-password')
  @RequirePermissions('system:user:reset-password')
  @Audit('用户管理', 'update')
  @ApiOperation({ summary: '重置用户密码（吊销其全部会话）' })
  async resetPassword(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(resetPasswordRequestSchema)) body: ResetPasswordRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.users.resetPassword(params.id, body, user.id);
  }

  @Put(':id/enabled')
  @RequirePermissions('system:user:enable')
  @Audit('用户管理', 'update')
  @ApiOperation({ summary: '启停用户' })
  async setEnabled(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body() body: { enabled: boolean },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserItem> {
    return this.users.setEnabled(params.id, body.enabled, user.id);
  }
}
