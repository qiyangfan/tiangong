import { describe, expect, it } from 'vitest';
import { testHttp } from './context';

describe('health 探针', () => {
  it('live/ready 均返回 200', async () => {
    const live = await testHttp().get('/api/v1/health/live');
    expect(live.status).toBe(200);
    expect(live.body).toMatchObject({ status: 'ok' });

    const ready = await testHttp().get('/api/v1/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toMatchObject({ checks: { database: 'up' } });
  });
});

describe('metrics 基础指标', () => {
  it('未认证公开可达：Prometheus 文本含进程与 HTTP 指标族，不套 envelope', async () => {
    const res = await testHttp().get('/api/v1/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('process_cpu_seconds_total');
    expect(res.text).toContain('http_requests_total');
    // 套件此前已发起登录（POST 200），HTTP 计数器必有样本
    expect(res.text).toMatch(/http_requests_total\{[^}]*method="POST"[^}]*status_code="200"/);
  });

  it('route 标签只含路由模板：查询串不入指标', async () => {
    const res = await testHttp().get('/api/v1/metrics?probe=leak-check');
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('leak-check');
  });
});
