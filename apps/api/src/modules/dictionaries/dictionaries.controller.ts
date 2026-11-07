import {
  type CreateDictItemRequest,
  createDictItemRequestSchema,
  type CreateDictTypeRequest,
  createDictTypeRequestSchema,
  type DictItem,
  type DictOption,
  type DictTypeItem,
  type DictTypeListQuery,
  dictTypeListQuerySchema,
  idParamSchema,
  type UpdateDictItemRequest,
  updateDictItemRequestSchema,
  type UpdateDictTypeRequest,
  updateDictTypeRequestSchema,
} from '@tiangong/contracts';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppError } from '../../common/app-error';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { DictionariesService } from './dictionaries.service';

@ApiTags('dictionaries')
@ApiBearerAuth()
@Controller()
export class DictionariesController {
  constructor(private readonly dicts: DictionariesService) {}

  // ---- 字典类型 ----

  @Get('dict-types')
  @RequirePermissions('system:dict:list')
  @ApiOperation({ summary: '字典类型分页列表' })
  async listTypes(@Query(new ZodValidationPipe(dictTypeListQuerySchema)) query: DictTypeListQuery) {
    return this.dicts.listTypes(query);
  }

  @Post('dict-types')
  @RequirePermissions('system:dict:create')
  @Audit('字典管理', 'insert')
  @ApiOperation({ summary: '新增字典类型' })
  async createType(
    @Body(new ZodValidationPipe(createDictTypeRequestSchema)) body: CreateDictTypeRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DictTypeItem> {
    return this.dicts.createType(body, user.id);
  }

  @Patch('dict-types/:id')
  @RequirePermissions('system:dict:update')
  @Audit('字典管理', 'update')
  @ApiOperation({ summary: '修改字典类型' })
  async updateType(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(updateDictTypeRequestSchema)) body: UpdateDictTypeRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DictTypeItem> {
    return this.dicts.updateType(params.id, body, user.id);
  }

  @Delete('dict-types/:id')
  @RequirePermissions('system:dict:delete')
  @Audit('字典管理', 'delete')
  @ApiOperation({ summary: '删除字典类型（连带其项）' })
  async removeType(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
  ): Promise<void> {
    await this.dicts.removeType(params.id);
  }

  // ---- 字典项 ----

  @Get('dict-types/:key/items')
  @RequirePermissions('system:dict:list')
  @ApiOperation({ summary: '某类型下字典项列表' })
  async listItems(@Param('key') key: string): Promise<DictItem[]> {
    const items = await this.dicts.listItems(key);
    if (items.length === 0) {
      const type = await this.dicts.listTypes({ page: 1, pageSize: 100, keyword: key });
      if (!type.items.some((t) => t.dictKey === key)) {
        throw new AppError('DICT_TYPE_NOT_FOUND');
      }
    }
    return items;
  }

  @Get('dicts/:dictKey/options')
  @ApiBearerAuth()
  @ApiOperation({ summary: '字典选项（useDict 消费，登录即可）' })
  async options(@Param('dictKey') dictKey: string): Promise<DictOption[]> {
    return this.dicts.options(dictKey);
  }

  @Post('dict-items')
  @RequirePermissions('system:dict:create')
  @Audit('字典管理', 'insert')
  @ApiOperation({ summary: '新增字典项' })
  async createItem(
    @Body(new ZodValidationPipe(createDictItemRequestSchema)) body: CreateDictItemRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DictItem> {
    return this.dicts.createItem(body, user.id);
  }

  @Patch('dict-items/:id')
  @RequirePermissions('system:dict:update')
  @Audit('字典管理', 'update')
  @ApiOperation({ summary: '修改字典项' })
  async updateItem(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(updateDictItemRequestSchema)) body: UpdateDictItemRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DictItem> {
    return this.dicts.updateItem(params.id, body, user.id);
  }

  @Delete('dict-items/:id')
  @RequirePermissions('system:dict:delete')
  @Audit('字典管理', 'delete')
  @ApiOperation({ summary: '删除字典项' })
  async removeItem(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
  ): Promise<void> {
    await this.dicts.removeItem(params.id);
  }
}
