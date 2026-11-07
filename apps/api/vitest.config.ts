import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  // esbuild 不支持 emitDecoratorMetadata；NestJS DI 依赖装饰器元数据，走 swc 转译
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['test/setup/reflect.ts'],
    // 集成测试需要起 Nest 应用与真实数据库，放宽容错超时
    testTimeout: 30_000,
    hookTimeout: 120_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
