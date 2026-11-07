import { type OnModuleDestroy, type OnModuleInit, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Prisma 连接持有者：全局单例，进程退出时优雅断开。 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
