import {
  type GenDefinitionItem,
  type GenDefinitionListQuery,
  genDefinitionListQuerySchema,
  type GenDefinitionRequest,
  genDefinitionRequestSchema,
  type GenDefinitionUpdate,
  genDefinitionUpdateSchema,
  idParamSchema,
} from '@tiangong/contracts';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { GeneratorService } from './gen-definition.service';

@ApiTags('gen-definitions')
@ApiBearerAuth()
@Controller('gen-definitions')
export class GenDefinitionController {
  constructor(private readonly gen: GeneratorService) {}

  @Get()
  @RequirePermissions('gen:list')
  @ApiOperation({ summary: '生成定义列表（全量，定义数量少不分页）' })
  async list(@Query(new ZodValidationPipe(genDefinitionListQuerySchema)) query: GenDefinitionListQuery) {
    return this.gen.list(query);
  }

  @Post('preview')
  @RequirePermissions('gen:preview')
  @ApiOperation({ summary: '草稿预览（不落库）' })
  async previewDraft(
    @Body(new ZodValidationPipe(genDefinitionRequestSchema)) body: GenDefinitionRequest,
  ): Promise<Array<{ path: string; content: string }>> {
    return this.gen.previewDraft(body);
  }

  @Get(':id/preview')
  @RequirePermissions('gen:preview')
  @ApiOperation({ summary: '已保存定义预览（与 CLI 落盘一致）' })
  async previewById(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }) {
    return this.gen.previewById(params.id);
  }

  @Post()
  @RequirePermissions('gen:create')
  @Audit('代码生成', 'insert')
  @ApiOperation({ summary: '新增生成定义' })
  async create(
    @Body(new ZodValidationPipe(genDefinitionRequestSchema)) body: GenDefinitionRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GenDefinitionItem> {
    return this.gen.create(body, user.id);
  }

  @Patch(':id')
  @RequirePermissions('gen:update')
  @Audit('代码生成', 'update')
  @ApiOperation({ summary: '修改生成定义（模块名不可变）' })
  async update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(genDefinitionUpdateSchema)) body: GenDefinitionUpdate,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GenDefinitionItem> {
    return this.gen.update(params.id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions('gen:delete')
  @Audit('代码生成', 'delete')
  @ApiOperation({ summary: '删除生成定义' })
  async remove(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }): Promise<void> {
    await this.gen.remove(params.id);
  }
}
