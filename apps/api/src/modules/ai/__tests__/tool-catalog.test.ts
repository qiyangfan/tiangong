import type { OpenAPIObject } from '@nestjs/swagger';
import { describe, expect, it } from 'vitest';
import { ToolCatalogService } from '../tools/tool-catalog.service';

function samplePaths(): Record<string, Record<string, unknown>> {
  return {
    '/samples': {
      get: {
        operationId: 'SampleController_list',
        summary: '示例列表',
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
        responses: {},
        'x-required-permissions': ['sample:list'],
      },
      post: {
        operationId: 'SampleController_create',
        summary: '新增示例',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name'],
              },
            },
          },
        },
        responses: {},
        'x-required-permissions': ['sample:create'],
      },
    },
    '/samples/{id}': {
      delete: {
        operationId: 'SampleController_remove',
        summary: '删除示例',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {},
        'x-required-permissions': ['sample:delete'],
      },
    },
  };
}

function excludedPaths(): Record<string, Record<string, unknown>> {
  return {
    '/dicts/{dictKey}/options': {
      get: {
        operationId: 'DictController_options',
        summary: '字典选项',
        parameters: [{ name: 'dictKey', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {},
      },
    },
    '/ai/conversations': {
      post: { operationId: 'AiController_create', responses: {} },
    },
    '/auth/login': {
      post: { operationId: 'AuthController_login', responses: {}, 'x-public': true },
    },
    '/metrics': { get: { operationId: 'MetricsController_get', responses: {} } },
    '/health/live': { get: { operationId: 'HealthController_live', responses: {} } },
    '/files/{id}/download': {
      get: {
        operationId: 'FilesController_download',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {},
        'x-required-permissions': ['files:list'],
      },
    },
  };
}

function document(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'test', version: '1' },
    paths: { ...samplePaths(), ...excludedPaths() },
  };
}

describe('ToolCatalogService', () => {
  it('未初始化时 fail-closed', () => {
    const catalog = new ToolCatalogService();
    expect(catalog.isInitialized()).toBe(false);
    expect(() => catalog.definitions(['sample:list'])).toThrow();
  });

  it('过滤 AI/认证/探针/公开/二进制路由，保留有权限与自助只读工具', () => {
    const catalog = new ToolCatalogService();
    catalog.initialize(document());
    const all = catalog.forPermissions(['*:*:*']).map((entry) => entry.toolName);
    expect(all).toEqual([
      'GET /dicts/{dictKey}/options',
      'GET /samples',
      'POST /samples',
      'DELETE /samples/{id}',
    ]);
  });

  it('按权限点 every 过滤；通配权限放行全部', () => {
    const catalog = new ToolCatalogService();
    catalog.initialize(document());
    expect(catalog.definitions(['sample:list']).map((tool) => tool.function.name)).toEqual([
      'get_dicts_dictkey_options',
      'get_samples',
    ]);
    expect(catalog.definitions([]).map((tool) => tool.function.name)).toEqual([
      'get_dicts_dictkey_options',
    ]);
    expect(catalog.find('delete_samples_id', ['sample:list'])).toBeUndefined();
    expect(catalog.find('delete_samples_id', ['*:*:*'])?.path).toBe('/samples/{id}');
  });

  it('wire name 兼容 OpenAI function name，path/query/body 合并为对象 schema', () => {
    const catalog = new ToolCatalogService();
    catalog.initialize(document());
    const create = catalog.find('post_samples', ['sample:create']);
    expect(create?.method).toBe('POST');
    expect(create?.hasBody).toBe(true);
    expect(create?.parameters).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    });
    const remove = catalog.find('delete_samples_id', ['sample:delete']);
    expect(remove?.pathParams).toEqual(['id']);
  });
});
