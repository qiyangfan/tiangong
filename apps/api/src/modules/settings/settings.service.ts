import {
  type CreateSettingRequest,
  type SettingItem,
  type UpdateSettingRequest,
} from '@tiangong/contracts';
import { Injectable } from '@nestjs/common';
import { Setting } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { CacheService } from '../../common/cache.service';
import { PrismaService } from '../../prisma/prisma.service';

const CACHE_KEY = 'settings:all';
const TTL_MS = 5 * 60_000;

/** 机密形态的 key 一律拒绝入库（spec：系统参数禁存密钥）。 */
const SECRET_KEY_PATTERN = /(secret|jwt|credential|private[_-]?key|access[_-]?key)/i;

/** 系统参数：非机密运行参数读写（缓存 + 写时失效）；内置参数保护。 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(keyword?: string): Promise<SettingItem[]> {
    const rows = await this.prisma.setting.findMany({
      where: keyword
        ? { OR: [{ name: { contains: keyword } }, { settingKey: { contains: keyword } }] }
        : undefined,
      orderBy: { id: 'asc' },
    });
    return rows.map(toItem);
  }

  async create(body: CreateSettingRequest, userId: number): Promise<SettingItem> {
    if (SECRET_KEY_PATTERN.test(body.settingKey)) {
      throw new AppError('SETTING_IMMUTABLE', 'secret-like keys are not allowed in settings');
    }
    const exists = await this.prisma.setting.findUnique({ where: { settingKey: body.settingKey } });
    if (exists) {
      throw new AppError('SETTING_KEY_TAKEN');
    }
    const row = await this.prisma.setting.create({ data: { ...body, createdBy: userId } });
    this.cache.delete(CACHE_KEY);
    return toItem(row);
  }

  async update(id: number, body: UpdateSettingRequest, userId: number): Promise<SettingItem> {
    const existing = await this.prisma.setting.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('SETTING_NOT_FOUND');
    }
    const row = await this.prisma.setting.update({
      where: { id },
      data: { ...body, updatedBy: userId },
    });
    this.cache.delete(CACHE_KEY);
    return toItem(row);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.setting.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('SETTING_NOT_FOUND');
    }
    if (existing.builtin) {
      throw new AppError('SETTING_IMMUTABLE', 'built-in setting cannot be deleted');
    }
    await this.prisma.setting.delete({ where: { id } });
    this.cache.delete(CACHE_KEY);
  }

  /** 服务端读取参数值（含缓存）。 */
  async getValue(key: string): Promise<string | null> {
    const all = this.cache.get<SettingItem[]>(CACHE_KEY) ?? (await this.list());
    if (!this.cache.get(CACHE_KEY)) {
      this.cache.set(CACHE_KEY, all, TTL_MS);
    }
    return all.find((s) => s.settingKey === key)?.value ?? null;
  }
}

function toItem(row: Setting): SettingItem {
  return {
    id: row.id,
    name: row.name,
    settingKey: row.settingKey,
    value: row.value,
    builtin: row.builtin,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
