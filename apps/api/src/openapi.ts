import { type INestApplication } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { ModulesContainer } from '@nestjs/core';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { z, type ZodType } from 'zod';

type JsonSchema = Record<string, unknown>;
type OperationLike = {
  operationId?: string;
  parameters?: Array<Record<string, unknown>>;
  requestBody?: Record<string, unknown>;
};
type ControllerClass = { name: string; prototype: Record<string, unknown> };

interface RouteArgMetadata {
  index: number;
  data?: unknown;
  pipes?: unknown[];
}

interface HandlerRef {
  metatype: ControllerClass;
  method: string;
}

const BODY_ARG: number = RouteParamtypes.BODY;
const QUERY_ARG: number = RouteParamtypes.QUERY;
const PARAM_ARG: number = RouteParamtypes.PARAM;

/** OpenAPI 文档配置单源：运行时 /docs 与契约快照测试共用。 */
function openApiConfig(): ReturnType<DocumentBuilder['build']> {
  return new DocumentBuilder()
    .setTitle('天工 API')
    .setDescription('通用后台脚手架平台 API（统一 envelope：code=0 成功；错误含稳定错误码）')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
}

function isZodSchema(value: unknown): value is ZodType {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { safeParse?: unknown }).safeParse === 'function'
  );
}

/** 从路由参数管道实例读取 Zod schema；未使用 Zod 管道的参数返回 undefined。 */
function schemaFromPipes(pipes: unknown[] | undefined): ZodType | undefined {
  for (const pipe of pipes ?? []) {
    if (!(pipe instanceof ZodValidationPipe)) {
      continue;
    }
    const schema = (pipe as unknown as { schemaOrDto?: unknown }).schemaOrDto;
    if (isZodSchema(schema)) {
      return schema;
    }
  }
  return undefined;
}

function toJsonSchema(schema: ZodType): JsonSchema | undefined {
  try {
    const json = z.toJSONSchema(schema, { io: 'input', target: 'draft-7' }) as JsonSchema;
    delete json['$schema'];
    return json;
  } catch {
    // 富化只提升工具质量，不改变运行时行为；无法转换时保留原文档
    return undefined;
  }
}

function handlerRefs(metatype: ControllerClass): HandlerRef[] {
  return Object.getOwnPropertyNames(metatype.prototype)
    .filter(
      (method) =>
        typeof metatype.prototype[method] === 'function' &&
        Reflect.getMetadata(ROUTE_ARGS_METADATA, metatype, method) !== undefined,
    )
    .map((method) => ({ metatype, method }));
}

function controllerHandlers(app: INestApplication): HandlerRef[] {
  const modules = app.get(ModulesContainer);
  const refs: HandlerRef[] = [];
  for (const moduleRef of modules.values()) {
    for (const wrapper of moduleRef.controllers.values()) {
      const metatype = wrapper.metatype as ControllerClass | undefined;
      if (metatype) {
        refs.push(...handlerRefs(metatype));
      }
    }
  }
  return refs;
}

/** operationId 默认是 `${ControllerName}_${handlerName}`，据此反查路由参数元数据。 */
function handlersByOperationId(app: INestApplication): Map<string, HandlerRef> {
  return new Map(controllerHandlers(app).map((ref) => [`${ref.metatype.name}_${ref.method}`, ref]));
}

function applyBody(operation: OperationLike, schema: JsonSchema): void {
  if (operation.requestBody === undefined) {
    operation.requestBody = { required: true, content: { 'application/json': { schema } } };
  }
}

interface ParameterInput {
  name: string;
  location: 'query' | 'path';
  property: unknown;
  required: Set<string>;
}

function parameterEntry(input: ParameterInput): Record<string, unknown> | undefined {
  if (typeof input.property !== 'object' || input.property === null) {
    return undefined;
  }
  const description = (input.property as { description?: unknown }).description;
  return {
    name: input.name,
    in: input.location,
    required: input.location === 'path' || input.required.has(input.name),
    schema: input.property,
    ...(typeof description === 'string' ? { description } : {}),
  };
}

function applyParameters(
  operation: OperationLike,
  location: 'query' | 'path',
  schema: JsonSchema,
): void {
  const properties = schema['properties'];
  if (typeof properties !== 'object' || properties === null) {
    return;
  }
  const required = new Set(Array.isArray(schema['required']) ? schema['required'].map(String) : []);
  const existing = new Set(
    (operation.parameters ?? []).map(
      (parameter) => `${String(parameter['in'])}:${String(parameter['name'])}`,
    ),
  );
  operation.parameters ??= [];
  for (const [name, property] of Object.entries(properties as Record<string, unknown>)) {
    const entry = parameterEntry({ name, location, property, required });
    if (entry && !existing.has(`${location}:${name}`)) {
      operation.parameters.push(entry);
    }
  }
}

function inputSchema(meta: RouteArgMetadata): JsonSchema | undefined {
  const schema = schemaFromPipes(meta.pipes);
  return schema ? toJsonSchema(schema) : undefined;
}

function applyTypedSchema(operation: OperationLike, type: number, json: JsonSchema): void {
  if (type === BODY_ARG) {
    applyBody(operation, json);
  } else if (type === QUERY_ARG) {
    applyParameters(operation, 'query', json);
  } else if (type === PARAM_ARG) {
    applyParameters(operation, 'path', json);
  }
}

function applySchema(operation: OperationLike, key: string, meta: RouteArgMetadata): void {
  const json = inputSchema(meta);
  if (json) {
    applyTypedSchema(operation, Number(key.split(':')[0]), json);
  }
}

function enrichOperation(operation: OperationLike, args: Record<string, RouteArgMetadata>): void {
  for (const [key, meta] of Object.entries(args)) {
    applySchema(operation, key, meta);
  }
}

function enrichHandler(operation: OperationLike, handler: HandlerRef): void {
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, handler.metatype, handler.method) as
    Record<string, RouteArgMetadata> | undefined;
  if (args) {
    enrichOperation(operation, args);
  }
}

function documentOperations(document: OpenAPIObject): OperationLike[] {
  const operations: OperationLike[] = [];
  for (const pathItem of Object.values(document.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = pathItem[method] as OperationLike | undefined;
      if (operation?.operationId) {
        operations.push(operation);
      }
    }
  }
  return operations;
}

/**
 * 用路由上的 Zod 输入 schema 补齐 OpenAPI 的 parameters/requestBody。
 * Nest Swagger 不认识 `new ZodValidationPipe(schema)`，不补齐会让工具目录丢失参数定义；
 * Zod 仍是唯一契约来源，这里只把同一份 schema 映射进文档。
 */
function applyZodInputSchemas(app: INestApplication, document: OpenAPIObject): void {
  const handlers = handlersByOperationId(app);
  for (const operation of documentOperations(document)) {
    const handler = handlers.get(operation.operationId ?? '');
    if (handler) {
      enrichHandler(operation, handler);
    }
  }
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const document = SwaggerModule.createDocument(app, openApiConfig());
  applyZodInputSchemas(app, document);
  return document;
}
