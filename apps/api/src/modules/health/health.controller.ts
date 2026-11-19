import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../security/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

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
    await this.health.checkDatabase();
    return { status: 'ok', checks: { database: 'up' } };
  }
}
