import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts'],
      // 阈值取 2026-11-19 实测基线（99.5/100/66.7）略下方
      thresholds: { statements: 98, branches: 95, functions: 60, lines: 98 },
    },
  },
});
