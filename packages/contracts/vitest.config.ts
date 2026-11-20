import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['src/**/*.ts'],
      // index.ts 只做 re-export，无可执行逻辑；vitest 4 的 v8 统计会把它算作未覆盖文件
      exclude: ['**/*.d.ts', 'src/index.ts'],
      // 阈值取 2026-11-20 实测（100/100/66.7/100）略下方
      thresholds: { statements: 99, branches: 98, functions: 64, lines: 99 },
    },
  },
});
