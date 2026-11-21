import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { MetadataScanner, ModulesContainer } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '../../prisma/seed-data';
import { PERMISSIONS_METADATA } from '../../src/security/require-permissions.decorator';
import { IS_PUBLIC_METADATA } from '../../src/security/public.decorator';
import { testApp } from './context';

interface RouteEntry {
  method: string;
  path: string;
  permissions: string[] | undefined;
  isPublic: boolean;
}

/** 种子权限目录：路由权限点必须在此登记，防止拼错或自造权限点后被静默放行。 */
const PERMISSION_CATALOG = new Set(
  PERMISSIONS.map(([resource, action]) => `${resource}:${action}`),
);

/** 自助端点：登录后仅需身份即可访问，不设权限点；新增项必须在此写明理由。 */
const SELF_SERVICE = new Set([
  'POST /auth/logout',
  'GET /auth/menus',
  'GET /auth/permissions',
  'GET /auth/profile',
  'PUT /auth/profile',
  'POST /auth/change-password',
  // 字典选项供所有登录用户的表单渲染下拉，按登录态读取，不按权限点拦截
  'GET /dicts/:dictKey/options',
]);

/** 权限点为 resource:action，resource 可带层级（system:user:list）。 */
const PERMISSION_PATTERN = /^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)+$/;

function normalizePath(basePath: string, routePath: string): string {
  const joined = `/${basePath}/${routePath}`.replace(/\/+/g, '/');
  return joined.length > 1 ? joined.replace(/\/$/, '') : joined;
}

function readPermissions(handler: object): string[] | undefined {
  const value = Reflect.getMetadata(PERMISSIONS_METADATA, handler) as unknown;
  return Array.isArray(value) ? (value as string[]) : undefined;
}

function routeOf(prototype: object, name: string, basePath: string): RouteEntry | undefined {
  const handler: unknown = Object.getOwnPropertyDescriptor(prototype, name)?.value;
  if (typeof handler !== 'function') {
    return undefined;
  }
  const routePath = Reflect.getMetadata(PATH_METADATA, handler) as unknown;
  if (typeof routePath !== 'string') {
    return undefined;
  }
  const verb = Reflect.getMetadata(METHOD_METADATA, handler) as unknown;
  return {
    method: typeof verb === 'number' ? (RequestMethod[verb] ?? String(verb)) : '?',
    path: normalizePath(basePath, routePath),
    permissions: readPermissions(handler),
    isPublic: Reflect.getMetadata(IS_PUBLIC_METADATA, handler) === true,
  };
}

function controllerRoutes(metatype: object, scanner: MetadataScanner): RouteEntry[] {
  const basePath = Reflect.getMetadata(PATH_METADATA, metatype) as unknown;
  const prototype = (metatype as { prototype: object }).prototype;
  return scanner
    .getAllMethodNames(prototype)
    .map((name) => routeOf(prototype, name, typeof basePath === 'string' ? basePath : ''))
    .filter((route): route is RouteEntry => route !== undefined);
}

/** 从已装配应用的模块容器枚举全部 HTTP 路由（新增控制器自动纳入）。 */
function collectRoutes(): RouteEntry[] {
  const modules = testApp().get(ModulesContainer);
  const scanner = new MetadataScanner();
  const routes: RouteEntry[] = [];
  for (const moduleRef of modules.values()) {
    for (const wrapper of moduleRef.controllers.values()) {
      const metatype: unknown = wrapper.metatype;
      if (typeof metatype === 'function') {
        routes.push(...controllerRoutes(metatype, scanner));
      }
    }
  }
  return routes;
}

function permissionViolation(key: string, permissions: string[]): string | undefined {
  if (permissions.length === 0) {
    return `${key}: 权限点为空`;
  }
  const invalid = permissions.filter((permission) => !PERMISSION_PATTERN.test(permission));
  if (invalid.length > 0) {
    return `${key}: 权限点格式非法（${invalid.join(', ')}）`;
  }
  const unregistered = permissions.filter((permission) => !PERMISSION_CATALOG.has(permission));
  return unregistered.length === 0
    ? undefined
    : `${key}: 权限点未在种子目录登记（${unregistered.join(', ')}）`;
}

function routeViolation(route: RouteEntry): string | undefined {
  const key = `${route.method} ${route.path}`;
  if (route.isPublic) {
    return route.permissions === undefined ? undefined : `${key}: @Public 不应叠加权限点`;
  }
  if (route.permissions === undefined) {
    return SELF_SERVICE.has(key) ? undefined : `${key}: 未声明权限点且不在自助白名单`;
  }
  return permissionViolation(key, route.permissions);
}

function permissionViolations(routes: RouteEntry[]): string[] {
  return routes
    .map(routeViolation)
    .filter((violation): violation is string => violation !== undefined);
}

describe('API 授权矩阵', () => {
  it('每个路由都显式声明 @Public 或权限点', () => {
    const routes = collectRoutes();
    // 自检：枚举失败会得到空数组，避免空集合让断言假绿
    expect(routes.length).toBeGreaterThan(50);
    expect(permissionViolations(routes)).toEqual([]);
  });

  it('自助端点白名单与实际路由一致（无过期条目）', () => {
    const keys = new Set(collectRoutes().map((route) => `${route.method} ${route.path}`));
    expect([...SELF_SERVICE].filter((key) => !keys.has(key))).toEqual([]);
  });
});
