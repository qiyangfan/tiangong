import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import type { Readable } from 'node:stream';
import {
  type FileItem,
  type FileListQuery,
  type PageResult,
  type UploadResponse,
} from '@tiangong/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { pageBounds, pageResult } from '../../common/pagination';
import type { StorageService } from '../../common/storage/storage.service';
import { STORAGE_SERVICE } from '../../common/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FilePolicyService } from './file-policy.service';

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

function requireUpload(file: Express.Multer.File | undefined): Express.Multer.File {
  if (!file || file.size === 0) {
    throw new AppError('VALIDATION_ERROR', 'file is required');
  }
  return file;
}

/** originalName 只做展示与还原名：取 basename，杜绝任何路径分量进存储路径。 */
function normalizeOriginalName(originalName: string | undefined): string {
  // busboy 对 quoted filename 按 latin1 解码，此处修复 UTF-8 文件名的 mojibake
  // （浏览器经 filename* 已正确解码，纯 ASCII 名称 round-trip 不变）
  const raw = path.basename(originalName ?? '').trim();
  const name =
    /[^\x20-\x7e]/.test(raw) && !Buffer.from(raw, 'latin1').toString('utf8').includes('\uFFFD')
      ? Buffer.from(raw, 'latin1').toString('utf8').normalize('NFC')
      : raw;
  if (name.length === 0 || name.length > 255) {
    throw new AppError('VALIDATION_ERROR', 'original file name is required');
  }
  return name;
}

function buildStorageKey(suffix: string): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const partition = `${now.getFullYear()}/${month}/${day}`;
  const ext = suffix ? `.${suffix}` : '';
  return `${partition}/${randomBytes(16).toString('hex')}${ext}`;
}

function toUploadResponse(row: FileObjectRow): UploadResponse {
  return {
    id: row.id,
    url: `/api/v1/files/${row.id}/download`,
    originalName: row.originalName,
    suffix: row.suffix,
    sizeBytes: row.sizeBytes,
  };
}

/** 通用附件：策略校验（大小/扩展名/类型一致性）→ 随机 key 落盘 → 元数据入库。 */
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: FilePolicyService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async upload(file: Express.Multer.File | undefined, userId: number): Promise<UploadResponse> {
    const checked = requireUpload(file);
    const target = await this.validateUpload(checked);
    const storageKey = buildStorageKey(target.suffix);
    await this.storage.save(storageKey, checked.buffer);
    const row = await this.insertRow({ target, storageKey, file: checked, userId });
    return toUploadResponse(row);
  }

  async list(query: FileListQuery): Promise<PageResult<FileItem>> {
    const where: Prisma.FileObjectWhereInput = {
      ...(query.keyword ? { originalName: { contains: query.keyword, mode: 'insensitive' } } : {}),
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

  private async validateUpload(
    file: Express.Multer.File,
  ): Promise<{ originalName: string; suffix: string }> {
    const originalName = normalizeOriginalName(file.originalname);
    const suffix = path.extname(originalName).slice(1).toLowerCase();
    const allowed = await this.policy.allowedExtensions();
    if (!allowed.has(suffix)) {
      throw new AppError('FILE_TYPE_REJECTED');
    }
    this.policy.assertMimeConsistent(suffix, file.mimetype);
    const maxBytes = await this.policy.maxBytes();
    if (file.size > maxBytes) {
      throw new AppError('FILE_TOO_LARGE');
    }
    return { originalName, suffix };
  }

  private async insertRow(input: {
    target: { originalName: string; suffix: string };
    storageKey: string;
    file: Express.Multer.File;
    userId: number;
  }): Promise<FileObjectRow> {
    const { target, storageKey, file, userId } = input;
    return this.prisma.fileObject.create({
      data: {
        storageKey,
        originalName: target.originalName,
        suffix: target.suffix,
        mimeType: file.mimetype || '',
        sizeBytes: file.size,
        checksumSha256: createHash('sha256').update(file.buffer).digest('hex'),
        createdBy: userId,
      },
      select: FILE_OBJECT_SELECT,
    });
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
