import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** 操作/登录审计落库（fire-and-forget，失败仅记日志不影响主流程）。 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  recordOper(entry: {
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
    status: 'ok' | 'error';
    errorMsg: string | null;
    costMs: number;
    requestId: string;
  }): void {
    void this.prisma.operLog
      .create({ data: { ...entry, operatedAt: new Date() } })
      .catch((err: unknown) => this.logger.warn(`oper log write failed: ${String(err)}`));
  }

  recordLogin(entry: {
    username: string;
    userId: number | null;
    client: string;
    ip: string;
    status: 'ok' | 'error';
    message: string | null;
    requestId: string;
  }): void {
    void this.prisma.loginLog
      .create({ data: { ...entry, loggedAt: new Date() } })
      .catch((err: unknown) => this.logger.warn(`login log write failed: ${String(err)}`));
  }
}
