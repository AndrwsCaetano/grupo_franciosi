# syntax=docker/dockerfile:1
#
# PWA motorista — build Vite + nginx (proxy para API nos mesmos caminhos do dev).

############
# builder
############
FROM node:22-bookworm-slim AS builder

WORKDIR /repo

COPY package.json package-lock.json turbo.json ./
COPY apps/pwa/package.json apps/pwa/

RUN npm ci -w pwa --include-workspace-root --ignore-scripts

COPY apps/pwa ./apps/pwa

WORKDIR /repo/apps/pwa

# URL pública da API (ex.: https://admin.exemplo.com). Vazio = mesma origem (nginx abaixo proxia).
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
