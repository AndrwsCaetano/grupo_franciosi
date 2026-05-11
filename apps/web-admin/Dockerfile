# syntax=docker/dockerfile:1
#
# Imagem do painel (web-admin) para produção: build Webpack + servidor nginx.

############
# 1. builder (webpack)
############
FROM node:22-bookworm-slim AS builder

WORKDIR /repo

COPY package.json package-lock.json turbo.json ./
COPY apps/web-admin/package.json apps/web-admin/

RUN npm ci -w web-admin --include-workspace-root --ignore-scripts

# Source do painel.
COPY apps/web-admin ./apps/web-admin

WORKDIR /repo/apps/web-admin
RUN npx webpack --config webpack.config.js --mode production

############
# 2. runner (nginx)
############
FROM nginx:1.27-alpine AS runner

# Config do nginx: serve estáticos do painel e proxia /auth, /users etc para o serviço `api`.
COPY apps/web-admin/nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build do webpack.
COPY --from=builder /repo/apps/web-admin/build /usr/share/nginx/html

EXPOSE 80
