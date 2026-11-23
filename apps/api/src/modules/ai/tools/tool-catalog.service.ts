import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppError } from '../../../common/app-error';
import type { OpenAPIObject, OperationObject, ParameterObject } from '@nestjs/swagger';
import type { AiToolDefinition } from '../provider/ai-provider';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const EXCLUDED_PREFIXES = ['/ai', '/auth', '/metrics', '/health'];
const SUPER_WILDCARD = '*:*:*';
const API_PREFIX = '/api/v1';

type JsonObject = Record<string, unknown>;

export interface ToolCatalogEntry {
  wireName: string;
  toolName: string;
  method: string;
  path: string;
  summary: string;
  permissions: string[];
  parameters: Record<string, unknown>;
  pathParams: string[];
  queryParams: string[];
  hasBody: boolean;
}

interface OperationWithExtensions extends OperationObject {
  'x-required-permissions'?: string[];
  'x-public'?: boolean;
}

function isExcludedPath(path: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Swagger 是否带 global prefix 取决于装配时机；目录统一存无前缀路径，执行时再补 /api/v1。 */
function normalizePath(path: string): string {
  if (path === API_PREFIX) {
    return '/';
  }
  return path.startsWith(`${API_PREFIX}/`) ? path.slice(API_PREFIX.length) : path;
}

function isBinary(operation: OperationWithExtensions, path: string): boolean {
  if (path.endsWith('/download')) {
    return true;
  }
  return Object.values(operation.responses).some((response) => {
    const content = (response as { content?: Record<string, unknown> }).content;
    return content !== undefined && Object.keys(content).includes('application/octet-stream');
  });
}

function permissionsOf(operation: OperationWithExtensions): string[] {
  const value = operation['x-required-permissions'];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function slugOf(path: string): string {
  const slug = path
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();
  return slug === '' ? 'root' : slug;
}

function wireNameOf(method: string, path: string): string {
  return `${method.toLowerCase()}_${slugOf(path)}`.slice(0, 64);
}

function schemaOf(schema: unknown): JsonObject | undefined {
  return typeof schema === 'object' && schema !== null ? (schema as JsonObject) : undefined;
}

function propertiesOf(schema: JsonObject | undefined): JsonObject {
  return (schema?.['properties'] as JsonObject | undefined) ?? {};
}

function requiredOf(schema: JsonObject | undefined): string[] {
  const required = schema?.['required'];
  return Array.isArray(required) ? required.map(String) : [];
}

function parametersOf(operation: OperationObject): ParameterObject[] {
  return (operation.parameters ?? []).filter(
    (parameter): parameter is ParameterObject => !('$ref' in parameter),
  );
}

function bodySchemaOf(operation: OperationObject): JsonObject | undefined {
  const requestBody = operation.requestBody;
  if (!requestBody || !('content' in requestBody)) {
    return undefined;
  }
  const content = requestBody.content as Record<string, { schema?: unknown }> | undefined;
  return schemaOf(content?.['application/json']?.schema);
}

function parameterProperties(params: ParameterObject[]): JsonObject {
  return Object.fromEntries(
    params
      .map((parameter) => [parameter.name, schemaOf(parameter.schema)] as const)
      .filter(([, schema]) => schema !== undefined),
  );
}

function parameterRequired(params: ParameterObject[]): string[] {
  return params
    .filter((parameter) => parameter.in === 'path' || parameter.required === true)
    .map((parameter) => parameter.name);
}

/** 合并 path/query/body 为单个 JSON Schema；body 未声明时允许额外字段，最终由平台校验。 */
function mergeParameters(
  params: ParameterObject[],
  bodySchema: JsonObject | undefined,
): Record<string, unknown> {
  const properties = { ...parameterProperties(params), ...propertiesOf(bodySchema) };
  const required = [...new Set([...parameterRequired(params), ...requiredOf(bodySchema)])];
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required: required.toSorted((a, b) => a.localeCompare(b)) } : {}),
    ...(bodySchema === undefined ? { additionalProperties: true } : {}),
  };
}

function buildEntry(
  method: string,
  rawPath: string,
  operation: OperationWithExtensions,
): ToolCatalogEntry | undefined {
  const path = normalizePath(rawPath);
  if (operation['x-public'] === true || isExcludedPath(path) || isBinary(operation, path)) {
    return undefined;
  }
  const params = parametersOf(operation);
  const bodySchema = bodySchemaOf(operation);
  return {
    wireName: wireNameOf(method, path),
    toolName: `${method.toUpperCase()} ${path}`,
    method: method.toUpperCase(),
    path,
    summary: operation.summary ?? operation.operationId ?? `${method.toUpperCase()} ${path}`,
    permissions: permissionsOf(operation),
    parameters: mergeParameters(params, bodySchema),
    pathParams: params.filter((p) => p.in === 'path').map((p) => p.name),
    queryParams: params.filter((p) => p.in === 'query').map((p) => p.name),
    hasBody: bodySchema !== undefined || !['GET', 'DELETE', 'HEAD'].includes(method.toUpperCase()),
  };
}

function operationsOf(pathItem: OpenAPIObject['paths'][string]): Array<{
  method: string;
  operation: OperationWithExtensions;
}> {
  return METHODS.flatMap((method) => {
    const operation = pathItem[method] as OperationWithExtensions | undefined;
    return operation ? [{ method, operation }] : [];
  });
}

function uniqueWireName(input: {
  wireName: string;
  method: string;
  path: string;
  used: Set<string>;
}): string {
  if (!input.used.has(input.wireName)) {
    return input.wireName;
  }
  const suffix = createHash('sha256')
    .update(`${input.method}:${input.path}`)
    .digest('hex')
    .slice(0, 6);
  return `${input.wireName.slice(0, 55)}_${suffix}`;
}

function addEntry(input: {
  entries: ToolCatalogEntry[];
  used: Set<string>;
  entry: ToolCatalogEntry;
  method: string;
  path: string;
}): void {
  input.entry.wireName = uniqueWireName({
    wireName: input.entry.wireName,
    method: input.method,
    path: input.path,
    used: input.used,
  });
  input.used.add(input.entry.wireName);
  input.entries.push(input.entry);
}

function collectEntries(document: OpenAPIObject): ToolCatalogEntry[] {
  const entries: ToolCatalogEntry[] = [];
  const wireNames = new Set<string>();
  const paths = Object.entries(document.paths).sort(([a], [b]) => a.localeCompare(b));
  for (const [path, pathItem] of paths) {
    for (const { method, operation } of operationsOf(pathItem)) {
      const entry = buildEntry(method, path, operation);
      if (entry) {
        addEntry({ entries, used: wireNames, entry, method, path });
      }
    }
  }
  return entries;
}

/**
 * 工具目录：启动时由 OpenAPI 生成一次，按调用者权限过滤。
 * 目录不作为授权依据；执行前仍走平台 API 的守卫。
 */
@Injectable()
export class ToolCatalogService {
  private entries: ToolCatalogEntry[] | undefined;

  initialize(document: OpenAPIObject): void {
    this.entries = collectEntries(document);
  }

  isInitialized(): boolean {
    return this.entries !== undefined;
  }

  size(): number {
    return this.requireEntries().length;
  }

  allowed(permissions: string[], entry: ToolCatalogEntry): boolean {
    if (permissions.includes(SUPER_WILDCARD)) {
      return true;
    }
    return entry.permissions.every((permission) => permissions.includes(permission));
  }

  forPermissions(permissions: string[]): ToolCatalogEntry[] {
    return this.requireEntries().filter((entry) => this.allowed(permissions, entry));
  }

  definitions(permissions: string[]): AiToolDefinition[] {
    return this.forPermissions(permissions).map((entry) => ({
      type: 'function',
      function: {
        name: entry.wireName,
        description: entry.summary,
        parameters: entry.parameters,
      },
    }));
  }

  find(wireName: string, permissions: string[]): ToolCatalogEntry | undefined {
    return this.forPermissions(permissions).find((entry) => entry.wireName === wireName);
  }

  private requireEntries(): ToolCatalogEntry[] {
    if (this.entries === undefined) {
      throw new AppError('INTERNAL_ERROR', 'AI tool catalog is not initialized');
    }
    return this.entries;
  }
}
