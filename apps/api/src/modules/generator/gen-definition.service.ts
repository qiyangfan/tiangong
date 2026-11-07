import {
  type GenDefinitionItem,
  type GenDefinitionListQuery,
  type GenDefinitionRequest,
  type GenPreviewFile,
  genFieldDefSchema,
  type GenDefinitionUpdate,
} from '@tiangong/contracts';
import { Injectable } from '@nestjs/common';
import { GenDefinition } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import { renderGenFiles } from './render';

/** 代码生成元数据：CRUD + 服务端模板渲染预览（与 CLI 落盘共用同一渲染器）。 */
@Injectable()
export class GeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: GenDefinitionListQuery): Promise<GenDefinitionItem[]> {
    const rows = await this.prisma.genDefinition.findMany({
      where: query.keyword
        ? {
            OR: [
              { name: { contains: query.keyword } },
              { displayName: { contains: query.keyword } },
            ],
          }
        : undefined,
      orderBy: { id: 'asc' },
    });
    return rows.map(toItem);
  }

  async detail(id: number): Promise<GenDefinitionItem> {
    return toItem(await this.assertExists(id));
  }

  async create(body: GenDefinitionRequest, userId: number): Promise<GenDefinitionItem> {
    const exists = await this.prisma.genDefinition.findUnique({ where: { name: body.name } });
    if (exists) {
      throw new AppError('GEN_NAME_TAKEN');
    }
    this.assertFieldsConsistent(body.fields);
    const row = await this.prisma.genDefinition.create({
      data: { name: body.name, displayName: body.displayName, fields: body.fields, remark: body.remark, createdBy: userId },
    });
    return toItem(row);
  }

  async update(id: number, body: GenDefinitionUpdate, userId: number): Promise<GenDefinitionItem> {
    const existing = await this.assertExists(id);
    // 模块名锚定目录名与路由段，生成落盘后不可变
    if (body.name !== undefined && body.name !== existing.name) {
      throw new AppError('CONFLICT', 'module name is immutable after creation');
    }
    if (body.fields) {
      this.assertFieldsConsistent(body.fields);
    }
    const row = await this.prisma.genDefinition.update({
      where: { id },
      data: { ...body, updatedBy: userId },
    });
    return toItem(row);
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.prisma.genDefinition.delete({ where: { id } });
  }

  /** 已保存定义的预览（与 CLI 落盘字节一致）。 */
  async previewById(id: number): Promise<GenPreviewFile[]> {
    const row = await this.assertExists(id);
    // 与 detail 同一防御：fields JSON 先过契约校验再渲染（防手工写库脏数据）
    const fields = genFieldDefSchema.array().parse(row.fields);
    return renderGenFiles({ name: row.name, displayName: row.displayName, fields });
  }

  /** 未保存定义的预览（表单实时预览；与落库同一条字段一致性校验）。 */
  previewDraft(body: GenDefinitionRequest): GenPreviewFile[] {
    this.assertFieldsConsistent(body.fields);
    return renderGenFiles({ name: body.name, displayName: body.displayName, fields: body.fields });
  }

  /** enum 字段必须给出选项；其余字段的 enumOptions 必须为空。 */
  private assertFieldsConsistent(fields: Array<{ type: string; enumOptions: string[] }>): void {
    for (const field of fields) {
      if (field.type === 'enum' && field.enumOptions.length === 0) {
        throw new AppError('GEN_FIELD_INVALID', 'enum field requires at least one option');
      }
      if (field.type !== 'enum' && field.enumOptions.length > 0) {
        throw new AppError('GEN_FIELD_INVALID', 'enum options are only allowed for enum fields');
      }
    }
  }

  private async assertExists(id: number): Promise<GenDefinition> {
    const row = await this.prisma.genDefinition.findUnique({ where: { id } });
    if (!row) {
      throw new AppError('GEN_DEFINITION_NOT_FOUND');
    }
    return row;
  }
}

/** fields JSON 经契约 schema 一次校验（防御手工写库的脏数据）。 */
function toItem(row: GenDefinition): GenDefinitionItem {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    fields: genFieldDefSchema.array().parse(row.fields),
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
