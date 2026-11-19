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
# 运行时只需要 node：移除镜像自带的 npm/corepack（其传递依赖带 CVE，且启动链路不再使用），
# 迁移改为 node 直调 deploy 产物内的 prisma CLI
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/package.json ./
# 非 root 运行：node 镜像自带 node 用户（uid 1000），prisma 引擎与 dist 均为只读使用
USER 1000:1000
EXPOSE 3000
# 迁移 → 幂等 seed（build 产物已含编译后的 seed）→ 起服务
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/prisma/seed.js && node dist/src/main.js"]
