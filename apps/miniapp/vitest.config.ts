import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', 'src/uni_modules/**'],
      // 阈值取 2026-11-19 实测基线（80.8/91.8/84.6）略下方
      thresholds: { statements: 78, branches: 88, functions: 80, lines: 78 },
    },
  },
});
