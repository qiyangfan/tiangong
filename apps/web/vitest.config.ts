import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// 纯逻辑单测走 node 环境；组件行为由 e2e 覆盖，不在单测层 mount
export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    // 口径只含 utils：store/router/api 的行为由 e2e 覆盖，而 e2e 不做插桩，
    // 纳入会把它们全记为未覆盖，得到虚低的数字
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['src/utils/**/*.ts'],
      exclude: ['**/*.d.ts'],
      // 阈值取 2026-11-19 实测基线（63.0/91.0/76.5）略下方
      thresholds: { statements: 60, branches: 88, functions: 72, lines: 60 },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
