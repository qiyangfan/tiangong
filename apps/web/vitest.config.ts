import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// 纯逻辑单测走 node 环境；组件行为由 e2e 覆盖，不在单测层 mount
export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
