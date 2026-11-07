import {
  type CreateSampleRequest,
  type PageResult,
  type SampleRecordItem,
  type SampleRecordQuery,
  type UpdateSampleRequest,
} from '@tiangong/contracts';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { pageBounds, pageResult } from '../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

/** 示例数据（SampleRecord）：通用 CRUD 纵向闭环载体，Web 与小程序共用同一 API。 */
@Injectable()
export class SampleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SampleRecordQuery): Promise<PageResult<SampleRecordItem>> {
    const where: Prisma.SampleRecordWhereInput = {
      ...(query.keyword ? { name: { contains: query.keyword } } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.enabled === undefined ? {} : { enabled: query.enabled }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.sampleRecord.findMany({
        where,
        orderBy: { id: 'desc' },
        ...pageBounds(query),
      }),
      this.prisma.sampleRecord.count({ where }),
    ]);
    return pageResult(rows.map(toItem), total, query);
  }

  async detail(id: number): Promise<SampleRecordItem> {
    const row = await this.prisma.sampleRecord.findUnique({ where: { id } });
    if (!row) {
      throw new AppError('SAMPLE_NOT_FOUND');
    }
    return toItem(row);
  }

  async create(body: CreateSampleRequest, userId: number): Promise<SampleRecordItem> {
    const row = await this.prisma.sampleRecord.create({
      data: {
        name: body.name,
        category: body.category,
        amount: body.amount ? new Prisma.Decimal(body.amount) : null,
        enabled: body.enabled,
        remark: body.remark,
        createdBy: userId,
      },
    });
    return toItem(row);
  }

  async update(id: number, body: UpdateSampleRequest, userId: number): Promise<SampleRecordItem> {
    await this.assertExists(id);
    const row = await this.prisma.sampleRecord.update({
      where: { id },
      data: {
        ...body,
        ...(body.amount === undefined ? {} : { amount: new Prisma.Decimal(body.amount) }),
        updatedBy: userId,
      },
    });
    return toItem(row);
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.prisma.sampleRecord.delete({ where: { id } });
  }

  private async assertExists(id: number): Promise<void> {
    const exists = await this.prisma.sampleRecord.findUnique({ where: { id } });
    if (!exists) {
      throw new AppError('SAMPLE_NOT_FOUND');
    }
  }
}

function toItem(row: {
  id: number;
  name: string;
  category: string | null;
  amount: Prisma.Decimal | null;
  enabled: boolean;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SampleRecordItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    // 金额以两位小数字符串传输（契约），避免浮点精度问题
    amount: row.amount ? row.amount.toFixed(2) : null,
    enabled: row.enabled,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
