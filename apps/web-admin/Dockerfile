# syntax=docker/dockerfile:1
#
# Imagem do painel (web-admin) para produção: build Webpack + servidor nginx.

############
# 1. builder (webpack)
############
FROM node:22-bookworm-slim AS builder

WORKDIR /repo

# Webpack e loaders estão em devDependencies — instalar com dev.
ENV NODE_ENV=development

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web-admin/package.json apps/web-admin/
COPY apps/pwa/package.json apps/pwa/
COPY packages/shared/package.json packages/shared/

RUN npm ci -w web-admin --include-workspace-root

COPY apps/web-admin ./apps/web-admin

WORKDIR /repo/apps/web-admin
RUN npm exec webpack -- --config webpack.config.js --mode production

############
# 2. runner (nginx)
############
FROM nginx:1.27-alpine AS runner

COPY apps/web-admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web-admin/build /usr/share/nginx/html

EXPOSE 80
