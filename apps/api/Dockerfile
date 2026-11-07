# 天工 API 生产镜像：多阶段，仓库根为 build context（.dockerignore 裁剪上下文）
# monorepo 构建需要完整源码（contracts 依赖 packages/config 的 tsconfig 基座等），
# 不能只选择性拷贝单个包——曾因漏拷 packages/config 导致镜像内编译失败。
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages packages
COPY apps/api apps/api
RUN pnpm install --frozen-lockfile \
    && pnpm --filter @tiangong/contracts build \
    && pnpm --filter @tiangong/api prisma:generate \
    && pnpm --filter @tiangong/api build \
    # 运行时依赖裁剪：api 包及其依赖落 /out（prisma 引擎由 postinstall 已备）
    && pnpm deploy --filter @tiangong/api --prod /out

FROM node:24-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/package.json ./
EXPOSE 3000
# 迁移 → 幂等 seed（build 产物已含编译后的 seed）→ 起服务
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main.js"]
