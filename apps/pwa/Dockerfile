# syntax=docker/dockerfile:1
#
# PWA motorista — build Vite + nginx (proxy para API nos mesmos caminhos do dev).

############
# builder
############
FROM node:22-bookworm-slim AS builder

WORKDIR /repo

ENV NODE_ENV=development

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web-admin/package.json apps/web-admin/
COPY apps/pwa/package.json apps/pwa/
COPY packages/shared/package.json packages/shared/

RUN npm ci -w pwa --include-workspace-root

COPY apps/pwa ./apps/pwa

WORKDIR /repo/apps/pwa

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

############
# runner
############
FROM nginx:1.27-alpine AS runner

COPY apps/pwa/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/pwa/dist /usr/share/nginx/html

EXPOSE 80
