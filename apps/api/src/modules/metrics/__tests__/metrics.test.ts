import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { MetricsController } from '../metrics.controller';
import { MetricsService } from '../metrics.service';

/** 仅构造期消费 METRICS_ENABLED，其余键返回 undefined。 */
function makeConfig(value?: boolean): ConfigService {
  return {
    get: (key: string) => (key === 'METRICS_ENABLED' ? value : undefined),
  } as unknown as ConfigService;
}

describe('metrics 端点开关', () => {
  it('未配置时默认开启', () => {
    expect(new MetricsService(makeConfig()).enabled).toBe(true);
  });

  it('METRICS_ENABLED=false：端点以 NotFound 拒绝（404 契约），服务标记关闭', async () => {
    const service = new MetricsService(makeConfig(false));
    const res = { setHeader: vi.fn(), send: vi.fn() };
    await expect(new MetricsController(service).metrics(res as never)).rejects.toThrow(
      NotFoundException,
    );
    expect(service.enabled).toBe(false);
    expect(res.send).not.toHaveBeenCalled();
  });
});
