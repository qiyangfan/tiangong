import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/app-error';
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

/** 上传策略单源：大小上限（系统参数 × 环境硬顶取小）、扩展名白名单、扩展名与 Content-Type 一致性。 */
@Injectable()
export class FilePolicyService {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  /** 生效上限 = min(系统参数 sys.file.maxSizeMb, 环境硬顶 MAX_UPLOAD_MB)。 */
  async maxBytes(): Promise<number> {
    const hardCapMb = this.config.get<number>('MAX_UPLOAD_MB') ?? 20;
    const configured = await this.settings.getValue('sys.file.maxSizeMb');
    const configuredMb =
      configured !== null && Number.isInteger(Number(configured)) && Number(configured) > 0
        ? Number(configured)
        : hardCapMb;
    return Math.min(configuredMb, hardCapMb) * 1024 * 1024;
  }

  async allowedExtensions(): Promise<Set<string>> {
    const raw = (await this.settings.getValue('sys.file.allowedExt')) ?? '';
    return new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  /** 声明 Content-Type 与扩展名冲突时拒绝；octet-stream/空视为未声明放行（白名单以扩展名为准）。 */
  assertMimeConsistent(suffix: string, mimetype: string | undefined): void {
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
