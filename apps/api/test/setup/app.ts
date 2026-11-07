import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import request from 'supertest';

/**
 * 集成测试应用装配：复刻 main.ts 的全局中间件与路由前缀，
 * 使测试请求与真实进程行为一致（requestId/Cookie/前缀/envelope）。
 */
export interface TestApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
}

export async function createTestApp(): Promise<TestApp> {
  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(helmet());
  app.use(cookieParser());
  const { requestIdMiddleware } = await import('../../src/common/request-id.middleware');
  app.use(requestIdMiddleware);
  app.setGlobalPrefix('api/v1');
  await app.init();
  return { app, http: request(app.getHttpServer()) };
}

/** 登录并返回 access token（默认超管）。 */
export async function login(
  http: ReturnType<typeof request>,
  username = 'admin',
  password = 'TestAdmin1pw',
  client: 'web' | 'miniapp' = 'miniapp',
): Promise<string> {
  const res = await http.post('/api/v1/auth/login').send({ username, password, client });
  if (res.status !== 200 || res.body.code !== 0) {
    throw new Error(`login failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.accessToken as string;
}
