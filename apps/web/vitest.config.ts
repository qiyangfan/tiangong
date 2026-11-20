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
      // echarts 为三方库装配、confirm 为 ElMessageBox 界面壳，二者行为由 e2e 覆盖
      exclude: ['**/*.d.ts', 'src/utils/echarts.ts', 'src/utils/confirm.ts'],
      // 阈值取 2026-11-20 实测（100/95.94/100/100）略下方
      thresholds: { statements: 98, branches: 92, functions: 96, lines: 98 },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
