import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../security/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('live')
  @ApiOperation({ summary: '存活探针（进程是否在运行）' })
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: '就绪探针（数据库连通）' })
  async ready(): Promise<{ status: string; checks: { database: string } }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', checks: { database: 'up' } };
  }
}
