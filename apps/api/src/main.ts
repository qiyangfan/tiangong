import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/request-id.middleware';

function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function configureHttp(app: NestExpressApplication, config: ConfigService): void {
  const origins = parseOrigins(config.get<string>('CORS_ORIGINS') ?? '');
  app.use(helmet());
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.enableCors({ origin: origins.length > 0 ? origins : true, credentials: true });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
}

function setupSwagger(app: NestExpressApplication): void {
  const doc = new DocumentBuilder()
    .setTitle('天工 API')
    .setDescription('通用后台脚手架平台 API（统一 envelope：code=0 成功；错误含稳定错误码）')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, doc));
}

function configureApp(app: NestExpressApplication): number {
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);
  configureHttp(app, config);
  setupSwagger(app);
  return config.get<number>('PORT') ?? 3000;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const port = configureApp(app);
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`api listening on :${port} (prefix /api/v1, docs at /docs)`);
}

void bootstrap();
