import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { createOpenApiDocument } from '../src/openapi';
import { PrismaService } from '../src/prisma/prisma.service';

/** 契约快照：结构与措辞变化必须显式更新（UPDATE_OPENAPI=1），防止对外契约静默漂移。 */
const snapshotPath = join(process.cwd(), 'openapi.snapshot.json');

/** 递归排序对象键，消除装饰器注册顺序等非契约差异。 */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sortKeys(item));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortKeys(item)]),
    );
  }
  return value;
}

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({})
    .compile();
  app = moduleRef.createNestApplication();
  await app.init();
});

afterAll(async () => {
  await app.close();
});

it('OpenAPI 文档与已提交快照一致', () => {
  const current = `${JSON.stringify(sortKeys(createOpenApiDocument(app)), null, 2)}\n`;
  if (process.env['UPDATE_OPENAPI'] === '1') {
    writeFileSync(snapshotPath, current);
    return;
  }
  // 比较解析后的结构而非字节：快照允许被 Prettier 重排，契约差异仍然严格暴露
  const expected: unknown = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  expect(
    sortKeys(createOpenApiDocument(app)),
    '对外契约变更需人工确认后执行 pnpm --filter @tiangong/api openapi:update',
  ).toEqual(expected);
});
