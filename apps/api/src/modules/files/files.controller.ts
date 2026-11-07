import {
  type FileListQuery,
  fileListQuerySchema,
  idParamSchema,
  type UploadResponse,
} from '@tiangong/contracts';
import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../security/current-user.decorator';
import { RequirePermissions } from '../../security/require-permissions.decorator';
import type { StorageService } from '../../common/storage/storage.service';
import { STORAGE_SERVICE } from '../../common/storage/storage.service';
import { FilesService } from './files.service';

// multipart 硬顶与 env MAX_UPLOAD_MB 同源（multer 层截断，防止超大请求先撑爆内存）
const HARD_CAP_BYTES = Number(process.env['MAX_UPLOAD_MB'] ?? 20) * 1024 * 1024;

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(
    private readonly files: FilesService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  @Post()
  @RequirePermissions('files:upload')
  @Audit('文件管理', 'insert')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: HARD_CAP_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传附件（multipart，字段名 file）' })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadResponse> {
    return this.files.upload(file, user.id);
  }

  @Get()
  @RequirePermissions('files:list')
  @ApiOperation({ summary: '附件分页列表' })
  async list(@Query(new ZodValidationPipe(fileListQuerySchema)) query: FileListQuery) {
    return this.files.list(query);
  }

  @Get(':id/download')
  @RequirePermissions('files:list')
  @ApiOperation({ summary: '授权下载附件（二进制流，非 envelope）' })
  async download(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Res() res: Response,
  ): Promise<void> {
    const { stream, row } = await this.files.download(params.id);
    const asciiName = row.originalName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
    res.setHeader('Content-Type', row.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(row.sizeBytes));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
    );
    stream.pipe(res);
  }

  @Delete(':id')
  @RequirePermissions('files:delete')
  @Audit('文件管理', 'delete')
  @ApiOperation({ summary: '删除附件（元数据 + 物理文件）' })
  async remove(@Param(new ZodValidationPipe(idParamSchema)) params: { id: number }): Promise<void> {
    await this.files.remove(params.id);
  }
}
