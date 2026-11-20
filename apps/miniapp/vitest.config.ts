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
      // 阈值取 2026-11-20 实测基线（81.5/90.8/82.7/81.5）略下方
      thresholds: { statements: 80, branches: 89, functions: 81, lines: 80 },
    },
  },
});
