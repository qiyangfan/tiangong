import { createHash } from 'node:crypto';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import type { Readable } from 'node:stream';
import {
  type FileItem,
  type FileListQuery,
  type PageResult,
  type UploadResponse,
} from '@tiangong/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { pageBounds, pageResult } from '../../common/pagination';
import type { StorageService } from '../../common/storage/storage.service';
import { STORAGE_SERVICE } from '../../common/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const EXT_MIME: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  txt: ['text/plain'],
};

const FILE_OBJECT_SELECT = {
  id: true,
  storageKey: true,
  originalName: true,
  suffix: true,
  mimeType: true,
  sizeBytes: true,
  storage: true,
  createdBy: true,
  createdAt: true,
} satisfies Prisma.FileObjectSelect;

type FileObjectRow = Prisma.FileObjectGetPayload<{ select: typeof FILE_OBJECT_SELECT }>;

/** 通用附件：策略校验（大小/扩展名/类型一致性）→ 随机 key 落盘 → 元数据入库。 */
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async upload(file: Express.Multer.File | undefined, userId: number): Promise<UploadResponse> {
    if (!file || file.size === 0) {
      throw new AppError('VALIDATION_ERROR', 'file is required');
    }
    // originalName 只做展示与还原名：取 basename，杜绝任何路径分量进存储路径；
    // busboy 对 quoted filename 按 latin1 解码，此处修复 UTF-8 文件名的 mojibake
    // （浏览器经 filename* 已正确解码，纯 ASCII 名称 round-trip 不变）
    const raw = path.basename(file.originalname ?? '').trim();
    const originalName =
      /[^\x20-\x7e]/.test(raw) && !Buffer.from(raw, 'latin1').toString('utf8').includes('\uFFFD')
        ? Buffer.from(raw, 'latin1').toString('utf8').normalize('NFC')
        : raw;
    if (originalName.length === 0 || originalName.length > 255) {
      throw new AppError('VALIDATION_ERROR', 'original file name is required');
    }
    const suffix = path.extname(originalName).slice(1).toLowerCase();
    const allowed = await this.allowedExtensions();
    if (!allowed.has(suffix)) {
      throw new AppError('FILE_TYPE_REJECTED');
    }
    this.assertMimeConsistent(suffix, file.mimetype);
    const maxBytes = await this.maxBytes();
    if (file.size > maxBytes) {
      throw new AppError('FILE_TOO_LARGE');
    }

    const now = new Date();
    const partition = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const storageKey = `${partition}/${randomBytes(16).toString('hex')}${suffix ? `.${suffix}` : ''}`;
    await this.storage.save(storageKey, file.buffer);

    const row = await this.prisma.fileObject.create({
      data: {
        storageKey,
        originalName,
        suffix,
        mimeType: file.mimetype || '',
        sizeBytes: file.size,
        checksumSha256: createHash('sha256').update(file.buffer).digest('hex'),
        createdBy: userId,
      },
      select: FILE_OBJECT_SELECT,
    });
    return {
      id: row.id,
      url: `/api/v1/files/${row.id}/download`,
      originalName: row.originalName,
      suffix: row.suffix,
      sizeBytes: row.sizeBytes,
    };
  }

  async list(query: FileListQuery): Promise<PageResult<FileItem>> {
    const where: Prisma.FileObjectWhereInput = {
      ...(query.keyword ? { originalName: { contains: query.keyword } } : {}),
      ...(query.suffix ? { suffix: query.suffix.toLowerCase() } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fileObject.findMany({ where, orderBy: { id: 'desc' }, ...pageBounds(query) }),
      this.prisma.fileObject.count({ where }),
    ]);
    return pageResult(rows.map(toItem), total, query);
  }

  /** 授权后流式下载：先过权限与元数据，再从存储层开只读流。 */
  async download(id: number): Promise<{ stream: Readable; row: FileObjectRow }> {
    const row = await this.prisma.fileObject.findUnique({
      where: { id },
      select: FILE_OBJECT_SELECT,
    });
    if (!row) {
      throw new AppError('FILE_NOT_FOUND');
    }
    return { stream: await this.storage.open(row.storageKey), row };
  }

  async remove(id: number): Promise<void> {
    const row = await this.prisma.fileObject.findUnique({ where: { id } });
    if (!row) {
      throw new AppError('FILE_NOT_FOUND');
    }
    await this.prisma.fileObject.delete({ where: { id } });
    await this.storage.remove(row.storageKey);
  }

  /** 生效上限 = min(系统参数 sys.file.maxSizeMb, 环境硬顶 MAX_UPLOAD_MB)。 */
  private async maxBytes(): Promise<number> {
    const hardCapMb = this.config.get<number>('MAX_UPLOAD_MB') ?? 20;
    const configured = await this.settings.getValue('sys.file.maxSizeMb');
    const configuredMb = configured !== null && Number.isInteger(Number(configured)) && Number(configured) > 0
      ? Number(configured)
      : hardCapMb;
    return Math.min(configuredMb, hardCapMb) * 1024 * 1024;
  }

  private async allowedExtensions(): Promise<Set<string>> {
    const raw = (await this.settings.getValue('sys.file.allowedExt')) ?? '';
    return new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  /** 声明 Content-Type 与扩展名冲突时拒绝；octet-stream/空视为未声明放行（白名单以扩展名为准）。 */
  private assertMimeConsistent(suffix: string, mimetype: string | undefined): void {
    if (!mimetype) {
      return;
    }
    const normalized = mimetype.toLowerCase();
    if (normalized === 'application/octet-stream') {
      return;
    }
    const known = EXT_MIME[suffix];
    if (known && !known.includes(normalized)) {
      throw new AppError('FILE_TYPE_REJECTED', `content type does not match .${suffix} file`);
    }
  }
}

function toItem(row: FileObjectRow): FileItem {
  return {
    id: row.id,
    originalName: row.originalName,
    suffix: row.suffix,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storage: row.storage,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}
