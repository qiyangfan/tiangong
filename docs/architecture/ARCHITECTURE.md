# 目标架构

```text
apps/web (Vue 3 + Element Plus) ----+
                                     +--> HTTPS /api/v1 --> apps/api (NestJS modular monolith) --> Prisma --> MySQL
apps/miniapp (uni-app Vue 3) -------+
                       |                        |
                       +-- packages/contracts --+  [公共 API DTO、业务无关枚举与 schema]
```

## Monorepo 目标布局

```text
apps/
  api/src/modules/{auth,users,roles,permissions,menus,dictionaries,settings,audit,files,generator,examples}
  web/src/{layouts,router,api,views,components,stores}
  miniapp/src/{pages,api,stores,components}
packages/{contracts,config}/
prisma migrations 位于 apps/api/prisma/
openspec/{specs,changes}/
docs/{adr,architecture,requirements,quality}/
deploy/{compose.yaml,nginx/}
AGENTS.md CONSTITUTION.md README.md
```

## 边界

- REST 接口由后端统一提供；禁止 Web/miniapp 直接访问数据库。
- 认证/授权/数据完整性在 API 层与 DB 约束层保证，客户端只做体验优化。
- RBAC 模型：User <-> UserRole <-> Role <-> RolePermission <-> Permission(resource, action)；菜单独立结构，菜单绑定权限标识用于展示，不用于代替 API 验权。
- `prisma` 模型只服务持久化；公开契约不暴露内部 User/passwordHash 等字段。
- 模块内 controller/service/dto，复用 PrismaService；禁止每个模块机械添加 repository/interface/mapper。
- 接口 `/api/v1`，统一响应与错误语义、版本化、分页、过滤、排序白名单。
- 变更要检查类型与运行时 schema、DB migration、Web/miniapp 两端构建、OpenAPI 差异。

## 延迟决策

不预设微服务、事件总线、Kafka、Redis、对象存储、租户引擎、第三方 SSO、复杂组织数据权限。若业务确有触发条件，通过 OpenSpec+ADR 决策。
