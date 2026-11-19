import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** 就绪检查：控制器只做协议转换，数据库探活收敛在服务层。 */
@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkDatabase(): Promise<boolean> {
    await this.prisma.$queryRaw`SELECT 1`;
    return true;
  }
}
