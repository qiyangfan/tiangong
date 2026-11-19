import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import request from 'supertest';
import { type ApiError, type ApiSuccess, type LoginResponse } from '@tiangong/contracts';
import { ADMIN_CREDENTIALS, NOPERM_CREDENTIALS } from './fixtures';

/** 响应头按 supertest 实际形态建模：Set-Cookie 可能是数组。 */
export interface ResponseHeaders {
  [header: string]: string | string[] | undefined;
}

/** 测试侧响应视图：supertest 不提供响应体类型，只在读取处用契约类型断言实际字段。 */
export interface EnvelopeResponse<T> {
  status: number;
  body: ApiSuccess<T>;
  headers: ResponseHeaders;
  text: string;
}

export interface ErrorResponse {
  status: number;
  body: ApiError;
  headers: ResponseHeaders;
}

export interface BufferResponse {
  status: number;
  body: ArrayBuffer;
  headers: ResponseHeaders;
}

export type TestHttp = ReturnType<typeof request>;

export interface TestApp {
  app: INestApplication;
  http: TestHttp;
}

export interface Credentials {
  username: string;
  password: string;
  client: 'web' | 'miniapp';
}

async function createNestApp(): Promise<INestApplication> {
  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(helmet());
  app.use(cookieParser());
  const { requestIdMiddleware } = await import('../../src/common/request-id.middleware');
  app.use(requestIdMiddleware);
  app.setGlobalPrefix('api/v1');
  // 显式监听：supertest 对未监听的传入 server 会在每次请求结束后自动 close，
  // 连续请求会撞上 address() 为 null 的竞态
  await app.listen(0, '127.0.0.1');
  return app;
}

/** 复刻 main.ts 的全局中间件与路由前缀，使测试请求与真实进程行为一致。 */
export async function createTestApp(): Promise<TestApp> {
  const app = await createNestApp();
  // @nestjs/testing 的 INestApplication 默认 TServer=any；运行时是 Node HTTP server
  return { app, http: request(app.getHttpServer() as Parameters<typeof request>[0]) };
}

export async function loginData(http: TestHttp, credentials: Credentials): Promise<LoginResponse> {
  const res = await http.post('/api/v1/auth/login').send(credentials);
  const envelope = res.body as ApiSuccess<LoginResponse>;
  if (res.status !== 200 || envelope.code !== 0) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(envelope)}`);
  }
  return envelope.data;
}

/** miniapp 客户端登录：refreshToken 在响应体而非 Cookie。 */
export function loginMiniapp(http: TestHttp): Promise<LoginResponse> {
  return loginData(http, { ...ADMIN_CREDENTIALS, client: 'miniapp' });
}

export async function loginAdmin(http: TestHttp): Promise<string> {
  const data = await loginMiniapp(http);
  return data.accessToken;
}

export async function loginNoperm(http: TestHttp): Promise<string> {
  const data = await loginData(http, { ...NOPERM_CREDENTIALS, client: 'miniapp' });
  return data.accessToken;
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
