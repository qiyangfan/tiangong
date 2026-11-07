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

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
