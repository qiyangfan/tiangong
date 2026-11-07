import {
  type CreateSettingRequest,
  createSettingRequestSchema,
  idParamSchema,
  type SettingItem,
  type SettingListQuery,
  settingListQuerySchema,
  type UpdateSettingRequest,
  updateSettingRequestSchema,
} from '@tiangong/contracts';
import { Body, Controller, Delete, Get, Param, Put, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequirePermissions('system:setting:list')
  @ApiOperation({ summary: '系统参数列表（非机密）' })
  async list(@Query(new ZodValidationPipe(settingListQuerySchema)) query: SettingListQuery) {
    return this.settings.list(query.keyword);
  }

  @Post()
  @RequirePermissions('system:setting:create')
  @Audit('系统参数', 'insert')
  @ApiOperation({ summary: '新增参数' })
  async create(
    @Body(new ZodValidationPipe(createSettingRequestSchema)) body: CreateSettingRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SettingItem> {
    return this.settings.create(body, user.id);
  }

  @Put(':id')
  @RequirePermissions('system:setting:update')
  @Audit('系统参数', 'update')
  @ApiOperation({ summary: '修改参数值' })
  async update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(updateSettingRequestSchema)) body: UpdateSettingRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SettingItem> {
    return this.settings.update(params.id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions('system:setting:delete')
  @Audit('系统参数', 'delete')
  @ApiOperation({ summary: '删除参数（内置参数拒绝）' })
  async remove(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }): Promise<void> {
    await this.settings.remove(params.id);
  }
}
