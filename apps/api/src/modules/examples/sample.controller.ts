import {
  type CreateSampleRequest,
  createSampleRequestSchema,
  idParamSchema,
  type SampleRecordItem,
  type SampleRecordQuery,
  sampleRecordQuerySchema,
  type UpdateSampleRequest,
  updateSampleRequestSchema,
} from '@tiangong/contracts';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { SampleService } from './sample.service';

@ApiTags('samples')
@ApiBearerAuth()
@Controller('samples')
export class SampleController {
  constructor(private readonly sample: SampleService) {}

  @Get()
  @RequirePermissions('sample:list')
  @ApiOperation({ summary: '示例数据分页列表' })
  async list(@Query(new ZodValidationPipe(sampleRecordQuerySchema)) query: SampleRecordQuery) {
    return this.sample.list(query);
  }

  @Get(':id')
  @RequirePermissions('sample:detail')
  @ApiOperation({ summary: '示例数据详情' })
  async detail(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }) {
    return this.sample.detail(params.id);
  }

  @Post()
  @RequirePermissions('sample:create')
  @Audit('示例数据', 'insert')
  @ApiOperation({ summary: '新增示例数据' })
  async create(
    @Body(new ZodValidationPipe(createSampleRequestSchema)) body: CreateSampleRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SampleRecordItem> {
    return this.sample.create(body, user.id);
  }

  @Patch(':id')
  @RequirePermissions('sample:update')
  @Audit('示例数据', 'update')
  @ApiOperation({ summary: '修改示例数据' })
  async update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(updateSampleRequestSchema)) body: UpdateSampleRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SampleRecordItem> {
    return this.sample.update(params.id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions('sample:delete')
  @Audit('示例数据', 'delete')
  @ApiOperation({ summary: '删除示例数据' })
  async remove(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }): Promise<void> {
    await this.sample.remove(params.id);
  }
}
