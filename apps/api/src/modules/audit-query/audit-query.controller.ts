import {
  type LoginLogItem,
  loginLogQuerySchema,
  type LoginLogQuery,
  type OperLogItem,
  type OperLogQuery,
  operLogQuerySchema,
  type PageResult,
} from '@tiangong/contracts';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import { AuditQueryService } from './audit-query.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller()
export class AuditQueryController {
  constructor(private readonly audit: AuditQueryService) {}

  @Get('oper-logs')
  @RequirePermissions('audit:oper:list')
  @ApiOperation({ summary: '操作日志检索' })
  async operLogs(
    @Query(new ZodValidationPipe(operLogQuerySchema)) query: OperLogQuery,
  ): Promise<PageResult<OperLogItem>> {
    return this.audit.operLogs(query);
  }

  @Get('login-logs')
  @RequirePermissions('audit:login:list')
  @ApiOperation({ summary: '登录日志检索' })
  async loginLogs(
    @Query(new ZodValidationPipe(loginLogQuerySchema)) query: LoginLogQuery,
  ): Promise<PageResult<LoginLogItem>> {
    return this.audit.loginLogs(query);
  }
}
