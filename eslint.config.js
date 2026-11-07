// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/api/prisma/migrations/**',
      'apps/miniapp/unpackage/**',
      '**/*.d.ts',
      'eslint.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
    // 未定义全局（DOM API 等）由 vue-tsc 类型检查兜底；TS 文件经 typescript-eslint
    // 已关闭 no-undef，.vue script 块同理对齐
    rules: { 'no-undef': 'off' },
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
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': 'off',
    },
  },
);
