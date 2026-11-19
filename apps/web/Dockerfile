# 天工 Web 生产镜像：Vite 构建产物 + nginx 托管与 API 反代（仓库根为 build context）
FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages packages
COPY apps/web apps/web
RUN pnpm install --frozen-lockfile \
    && pnpm --filter @tiangong/contracts build \
    && pnpm --filter @tiangong/web build

# unprivileged 变体：以非 root 监听 8080（对应 deploy/nginx/nginx.conf 与 compose 端口映射）
FROM nginxinc/nginx-unprivileged:1.31-alpine AS runtime
# 基线镜像打包的 apk 组件滞后于 alpine 仓库（zlib/libexpat/curl 等有安全补丁）；
# 构建期升到仓库当前版本。镜像默认 uid 101，升级后显式还原非 root。
USER 0:0
RUN apk upgrade --no-cache
USER 101:101
COPY deploy/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
