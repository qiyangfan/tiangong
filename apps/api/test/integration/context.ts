import { afterAll, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { cleanupFixtures, createNopermFixture, seedDatabase } from '../setup/database';
import { runPnpm } from '../setup/commands';
import { bearer, createTestApp, loginAdmin, loginNoperm, type TestApp } from '../setup/app';

/**
 * 集成测试上下文：各套件静态 import 本模块，收集阶段注册的 beforeAll 归属该套件，
 * 负责迁移/种子、装配应用与两端登录。vitest 默认按文件隔离模块，故每个测试文件各装配一次。
 */
const state = {
  app: null as TestApp | null,
  http: {} as TestApp['http'],
  adminToken: '',
  nopermToken: '',
};

export const prisma = new PrismaClient();

export function testHttp(): TestApp['http'] {
  return state.http;
}

/** 超管授权头。 */
export function adminAuth(): Record<string, string> {
  return bearer(state.adminToken);
}

/** 零权限用户授权头。 */
export function nopermAuth(): Record<string, string> {
  return bearer(state.nopermToken);
}

beforeAll(async () => {
  seedDatabase(runPnpm);
  await cleanupFixtures(prisma);
  await createNopermFixture(prisma);
  const app = await createTestApp();
  state.app = app;
  state.http = app.http;
  state.adminToken = await loginAdmin(app.http);
  state.nopermToken = await loginNoperm(app.http);
});

afterAll(async () => {
  await state.app?.app.close();
  await prisma.$disconnect();
});
