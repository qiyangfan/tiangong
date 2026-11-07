import {
  type LoginLogItem,
  type LoginLogQuery,
  type OperLogItem,
  type OperLogQuery,
  type PageResult,
} from '@tiangong/contracts';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { pageBounds, pageResult } from '../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

/** 审计查询：操作日志/登录日志检索。 */
@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async operLogs(query: OperLogQuery): Promise<PageResult<OperLogItem>> {
    const where: Prisma.OperLogWhereInput = {
      ...(query.username ? { username: query.username } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.businessType ? { businessType: query.businessType } : {}),
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword } },
              { requestPath: { contains: query.keyword } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.operLog.findMany({
        where,
        orderBy: { operatedAt: 'desc' },
        ...pageBounds(query),
      }),
      this.prisma.operLog.count({ where }),
    ]);
    return pageResult(rows.map(toOperItem), total, query);
  }

  async loginLogs(query: LoginLogQuery): Promise<PageResult<LoginLogItem>> {
    const where: Prisma.LoginLogWhereInput = {
      ...(query.username ? { username: query.username } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? { OR: [{ username: { contains: query.keyword } }, { ip: { contains: query.keyword } }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.loginLog.findMany({
        where,
        orderBy: { loggedAt: 'desc' },
        ...pageBounds(query),
      }),
      this.prisma.loginLog.count({ where }),
    ]);
    return pageResult(rows.map(toLoginItem), total, query);
  }
}

function toOperItem(row: {
  id: number;
  title: string;
  businessType: string;
  method: string;
  requestMethod: string;
  requestPath: string;
  userId: number | null;
  username: string;
  client: string;
  ip: string;
  params: string | null;
  result: string | null;
  status: string;
  errorMsg: string | null;
  costMs: number;
  requestId: string;
  operatedAt: Date;
}): OperLogItem {
  return {
    id: row.id,
    title: row.title,
    businessType: row.businessType as OperLogItem['businessType'],
    method: row.method,
    requestMethod: row.requestMethod,
    requestPath: row.requestPath,
    userId: row.userId,
    username: row.username,
    client: row.client,
    ip: row.ip,
    params: row.params,
    result: row.result,
    status: row.status as OperLogItem['status'],
    errorMsg: row.errorMsg,
    costMs: row.costMs,
    requestId: row.requestId,
    operatedAt: row.operatedAt.toISOString(),
  };
}

function toLoginItem(row: {
  id: number;
  username: string;
  userId: number | null;
  client: string;
  ip: string;
  status: string;
  message: string | null;
  requestId: string;
  loggedAt: Date;
}): LoginLogItem {
  return {
    id: row.id,
    username: row.username,
    userId: row.userId,
    client: row.client,
    ip: row.ip,
    status: row.status as LoginLogItem['status'],
    message: row.message,
    requestId: row.requestId,
    loggedAt: row.loggedAt.toISOString(),
  };
}
