// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import sonarjs from 'eslint-plugin-sonarjs';
import vueA11y from 'eslint-plugin-vuejs-accessibility';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/api/prisma/migrations/**',
      'apps/miniapp/unpackage/**',
      // wot-design-uni 以官方 tarball vendor 进树（uni_modules 内联），第三方源码不进本仓检查程序
      'apps/miniapp/src/uni_modules/**',
      '**/*.d.ts',
      'eslint.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  // 类型感知规则覆盖 ts 与 .vue script 块：vue-eslint-parser 把 script 交给
  // tseslint.parser，projectService 负责按文件就近解析 tsconfig
  ...tseslint.configs.strictTypeChecked.map((c) => ({ ...c, files: ['**/*.{ts,vue}'] })),
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
  },
  sonarjs.configs.recommended,
  ...vueA11y.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    plugins: { import: importPlugin },
    settings: {
      'import/ignore': ['\\.css$'],
      // uno.css 由 unocss vite 插件在构建期生成，磁盘上不存在实体文件
      'import/core-modules': ['uno.css'],
      // 依赖图只认声明过的扩展名：不声明 .ts 时 no-cycle 对 TS 文件静默失效
      'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
      'import/resolver': {
        // monorepo 多 tsconfig 属预期形态，屏蔽解析器的多工程警告
        typescript: {
          project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
          noWarnOnMultipleProjects: true,
        },
        node: { extensions: ['.js', '.mjs', '.ts', '.vue'] },
      },
    },
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      'import/no-cycle': 'error',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      // recommendedTypeChecked 自带的 tseslint.parser 会抢占 .vue 入口解析，
      // 这里显式还原 vue 解析器，script 块内再交给 tseslint.parser
      parser: vueParser,
      parserOptions: { parser: tseslint.parser },
    },
    // 未定义全局（DOM API 等）由 vue-tsc 类型检查兜底；TS 文件经 typescript-eslint
    // 已关闭 no-undef，.vue script 块同理对齐
    rules: { 'no-undef': 'off' },
  },
  {
    // strict 档的两个框架/表达取舍：数字插值类型安全；NestJS 模块类靠装饰器承载元数据
    files: ['**/*.{ts,vue}'],
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  {
    // 集成测试的 dataOf<T>(body: unknown): T 是类型断言辅助函数，T 天然只出现在返回位；
    // 该规则在此只能靠改成 unknown + 逐处 cast 绕过，收益为负
    files: ['apps/api/test/integration/**/*.ts'],
    rules: { '@typescript-eslint/no-unnecessary-type-parameters': 'off' },
  },
  {
    // 独立 Node 脚本（构建期工具等）：声明 Node 全局，no-undef 继续生效
    files: ['**/*.{mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // NestJS DI 依赖构造器类型的运行时元数据，禁止自动改写为 import type
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 结构质量门禁：一律使用 ESLint 规则默认阈值（圈复杂度 20、嵌套 4、参数 3、
      // 语句 10、单函数 50 行、单文件 300 行、嵌套回调 10），不调参、不按目录豁免
      complexity: 'error',
      'max-depth': 'error',
      'max-lines': 'error',
      'max-lines-per-function': 'error',
      'max-nested-callbacks': 'error',
      'max-params': 'error',
      'max-statements': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': 'off',
    },
  },
);
