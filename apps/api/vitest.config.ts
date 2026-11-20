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
    setupFiles: ['test/setup/env.ts', 'test/setup/reflect.ts'],
    // 集成测试需要起 Nest 应用与真实数据库，放宽容错超时
    testTimeout: 30_000,
    hookTimeout: 120_000,
    pool: 'forks',
    // 单 worker 顺序执行：集成套件共享同一测试库
    maxWorkers: 1,
    // 集成上下文在模块收集阶段注册 beforeAll/afterAll，必须按文件重放模块：
    // 共享模块注册表会让钩子只归属首个文件，其 afterAll 提前关闭应用
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts'],
      // 阈值取 2026-11-20 实测 74.1/60.4/81.7/73.7 略下方；分支保持 58（vitest 4 v8 分支口径波动大）
      thresholds: { statements: 72, branches: 58, functions: 78, lines: 72 },
    },
  },
});
