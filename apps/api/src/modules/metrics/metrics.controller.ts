import { Controller, Get, NotFoundException, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import { Public } from '../../security/public.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /** Prometheus 抓取端点：纯文本透传，不套 envelope；生产可置 METRICS_ENABLED=false 关闭（404）。 */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Prometheus 文本指标（Node 进程 + HTTP RED）' })
  @ApiProduces('text/plain; version=0.0.4')
  async metrics(@Res() res: Response): Promise<void> {
    if (!this.metricsService.enabled) {
      throw new NotFoundException();
    }
    const { text, contentType } = await this.metricsService.render();
    res.setHeader('Content-Type', contentType);
    res.send(text);
  }
}
