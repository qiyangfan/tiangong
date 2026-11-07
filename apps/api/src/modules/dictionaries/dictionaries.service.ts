import {
  type CreateDictItemRequest,
  type CreateDictTypeRequest,
  type DictItem,
  type DictOption,
  type DictTypeItem,
  type DictTypeListQuery,
  type PageResult,
  type TagType,
  type UpdateDictItemRequest,
  type UpdateDictTypeRequest,
} from '@tiangong/contracts';
import { Injectable } from '@nestjs/common';
import { DictItem as DictItemRow, DictType } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { CacheService } from '../../common/cache.service';
import { pageBounds, pageResult } from '../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const OPTIONS_CACHE_PREFIX = 'dict:options:';
const OPTIONS_TTL_MS = 5 * 60_000;

/** 字典管理：类型/项 CRUD + 选项读取（进程内缓存，写时精确失效）。 */
@Injectable()
export class DictionariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async listTypes(query: DictTypeListQuery): Promise<PageResult<DictTypeItem>> {
    const where = {
      ...(query.keyword
        ? { OR: [{ name: { contains: query.keyword } }, { dictKey: { contains: query.keyword } }] }
        : {}),
      ...(query.enabled === undefined ? {} : { enabled: query.enabled }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.dictType.findMany({ where, orderBy: { id: 'asc' }, ...pageBounds(query) }),
      this.prisma.dictType.count({ where }),
    ]);
    return pageResult(rows.map(typeToItem), total, query);
  }

  async createType(body: CreateDictTypeRequest, userId: number): Promise<DictTypeItem> {
    const exists = await this.prisma.dictType.findUnique({ where: { dictKey: body.dictKey } });
    if (exists) {
      throw new AppError('DICT_KEY_TAKEN');
    }
    const row = await this.prisma.dictType.create({ data: { ...body, createdBy: userId } });
    return typeToItem(row);
  }

  async updateType(id: number, body: UpdateDictTypeRequest, userId: number): Promise<DictTypeItem> {
    const existing = await this.prisma.dictType.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('DICT_TYPE_NOT_FOUND');
    }
    if (body.dictKey && body.dictKey !== existing.dictKey) {
      throw new AppError('CONFLICT', 'dict key is immutable');
    }
    const row = await this.prisma.dictType.update({
      where: { id },
      data: { ...body, updatedBy: userId },
    });
    this.cache.delete(`${OPTIONS_CACHE_PREFIX}${existing.dictKey}`);
    return typeToItem(row);
  }

  async removeType(id: number): Promise<void> {
    const existing = await this.prisma.dictType.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('DICT_TYPE_NOT_FOUND');
    }
    await this.prisma.$transaction([
      this.prisma.dictItem.deleteMany({ where: { dictKey: existing.dictKey } }),
      this.prisma.dictType.delete({ where: { id } }),
    ]);
    this.cache.delete(`${OPTIONS_CACHE_PREFIX}${existing.dictKey}`);
  }

  async listItems(dictKey: string, enabledOnly?: boolean): Promise<DictItem[]> {
    const rows = await this.prisma.dictItem.findMany({
      where: { dictKey, ...(enabledOnly ? { enabled: true } : {}) },
      orderBy: { sort: 'asc' },
    });
    return rows.map(itemToItem);
  }

  /** useDict 消费：某字典类型下全部启用项（label/value/tagType）。 */
  async options(dictKey: string): Promise<DictOption[]> {
    const cacheKey = `${OPTIONS_CACHE_PREFIX}${dictKey}`;
    const cached = this.cache.get<DictOption[]>(cacheKey);
    if (cached) {
      return cached;
    }
    const rows = await this.prisma.dictItem.findMany({
      where: { dictKey, enabled: true },
      orderBy: { sort: 'asc' },
    });
    const options = rows.map((r) => ({
      label: r.label,
      value: r.value,
      tagType: (r.tagType as TagType | null) ?? null,
    }));
    this.cache.set(cacheKey, options, OPTIONS_TTL_MS);
    return options;
  }

  async createItem(body: CreateDictItemRequest, userId: number): Promise<DictItem> {
    const type = await this.prisma.dictType.findUnique({ where: { dictKey: body.dictKey } });
    if (!type) {
      throw new AppError('DICT_TYPE_NOT_FOUND');
    }
    const exists = await this.prisma.dictItem.findUnique({
      where: { dictKey_value: { dictKey: body.dictKey, value: body.value } },
    });
    if (exists) {
      throw new AppError('DICT_VALUE_TAKEN');
    }
    const row = await this.prisma.dictItem.create({ data: { ...body, createdBy: userId } });
    this.cache.delete(`${OPTIONS_CACHE_PREFIX}${body.dictKey}`);
    return itemToItem(row);
  }

  async updateItem(id: number, body: UpdateDictItemRequest, userId: number): Promise<DictItem> {
    const existing = await this.prisma.dictItem.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('DICT_ITEM_NOT_FOUND');
    }
    const row = await this.prisma.dictItem.update({
      where: { id },
      data: { ...body, updatedBy: userId },
    });
    this.cache.delete(`${OPTIONS_CACHE_PREFIX}${existing.dictKey}`);
    return itemToItem(row);
  }

  async removeItem(id: number): Promise<void> {
    const existing = await this.prisma.dictItem.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('DICT_ITEM_NOT_FOUND');
    }
    await this.prisma.dictItem.delete({ where: { id } });
    this.cache.delete(`${OPTIONS_CACHE_PREFIX}${existing.dictKey}`);
  }
}

function typeToItem(row: DictType): DictTypeItem {
  return {
    id: row.id,
    name: row.name,
    dictKey: row.dictKey,
    enabled: row.enabled,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function itemToItem(row: DictItemRow): DictItem {
  return {
    id: row.id,
    dictKey: row.dictKey,
    label: row.label,
    value: row.value,
    tagType: (row.tagType as TagType | null) ?? null,
    sort: row.sort,
    isDefault: row.isDefault,
    enabled: row.enabled,
    remark: row.remark,
  };
}
