import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** OpenAPI 文档配置单源：运行时 /docs 与契约快照测试共用。 */
function openApiConfig(): ReturnType<DocumentBuilder['build']> {
  return new DocumentBuilder()
    .setTitle('天工 API')
    .setDescription('通用后台脚手架平台 API（统一 envelope：code=0 成功；错误含稳定错误码）')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, openApiConfig());
}
