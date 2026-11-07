import { defineConfig } from '@playwright/test';
import { API_URL, WEB_URL, apiServerEnv } from './src/env';

export default defineConfig({
  testDir: 'tests',
  globalSetup: './global-setup.ts',
  // html 报告显式常开（默认 reporter 在非交互环境只出 list，CI 的 artifact 上传依赖此产物）
  reporter: [['list'], ['html', { open: 'never' }]],
  // 单 worker 顺序执行：对单一 seeded 库保持确定性
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'pnpm --filter @tiangong/api dev',
      url: `${API_URL}/api/v1/health/live`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: apiServerEnv(),
    },
    {
      command: 'pnpm --filter @tiangong/web exec vite --port 5174 --strictPort',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      // vite 代理 /api 指向本套 e2e api 实例（进程 env 优先于 .env.development）
      env: { VITE_DEV_PROXY_TARGET: API_URL },
    },
  ],
});
