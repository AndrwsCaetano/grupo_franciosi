# syntax=docker/dockerfile:1
#
# Imagem da API NestJS para produção.
#
# Estágios:
#   1. deps    — npm ci só para api + @grupo-franciosi/shared (lockfile da raiz).
#   2. builder — shared + prisma generate + nest build.
#   3. runner  — Oracle Instant Client + artefactos + npm prune (sem devDeps).
#
# Instant Client embutido em amd64 (modo Thick). ARM: ajustar ou usar modo thin.

############
# 1. deps
############
FROM node:22-bookworm-slim AS deps

WORKDIR /repo

# Instalar devDependencies (Webpack/Vite não entram aqui; Nest/Prisma/tsc sim).
ENV NODE_ENV=development

COPY package.json package-lock.json turbo.json ./

# shared completo: prepare (tsc) precisa de tsconfig.json e src antes do npm ci.
COPY packages/shared ./packages/shared

COPY apps/api/package.json apps/api/
COPY apps/web-admin/package.json apps/web-admin/
COPY apps/pwa/package.json apps/pwa/

# Subconjunto do monorepo alinhado ao lockfile; scripts ligados (postinstall Prisma).
RUN npm ci --include-workspace-root \
    --workspace=api \
    --workspace=@grupo-franciosi/shared

############
# 2. builder
############
FROM node:22-bookworm-slim AS builder

WORKDIR /repo

ENV NODE_ENV=development

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json /repo/package-lock.json /repo/turbo.json ./
COPY --from=deps /repo/packages ./packages

COPY apps/api ./apps/api
# npm ci no deps instalou dependências da workspace em apps/api/node_modules (não vem no COPY do host).
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules

RUN npm run build -w @grupo-franciosi/shared

# Prisma + Nest: com npm ci parcial, CLI ficam em apps/api/node_modules/.bin.
WORKDIR /repo/apps/api
RUN ./node_modules/.bin/prisma generate && ./node_modules/.bin/nest build

############
# 3. runner
############
FROM node:22-bookworm-slim AS runner

ARG TARGETARCH=amd64

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libaio1 wget unzip dumb-init \
  && if [ "$TARGETARCH" = "amd64" ]; then \
       mkdir -p /opt/oracle \
       && wget -q -O /tmp/ic.zip https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip \
       && unzip -q /tmp/ic.zip -d /opt/oracle \
       && rm /tmp/ic.zip \
       && IC_REAL="$(ls -d /opt/oracle/instantclient_* 2>/dev/null | head -1)" \
       && test -n "$IC_REAL" \
       && ln -sfn "$IC_REAL" /opt/oracle/instantclient \
       && echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf \
       && ldconfig; \
     fi \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=4000 \
    ORACLE_CLIENT_LIB_DIR=/opt/oracle/instantclient

WORKDIR /app

COPY --from=builder /repo/node_modules /app/node_modules
COPY --from=builder /repo/package.json /repo/package-lock.json /app/
COPY --from=builder /repo/turbo.json /app/turbo.json

COPY --from=builder /repo/packages /app/packages

COPY --from=builder /repo/apps/api/dist /app/apps/api/dist
COPY --from=builder /repo/apps/api/node_modules /app/apps/api/node_modules
COPY --from=builder /repo/apps/api/package.json /app/apps/api/package.json
COPY --from=builder /repo/apps/api/prisma.config.ts /app/apps/api/prisma.config.ts
COPY --from=builder /repo/apps/api/prisma /app/apps/api/prisma

# Stubs para o npm reconhecer todos os workspaces ao fazer prune na raiz.
COPY apps/web-admin/package.json /app/apps/web-admin/package.json
COPY apps/pwa/package.json /app/apps/pwa/package.json

RUN mkdir -p /app/apps/api/uploads \
  && cd /app \
  && npm prune --omit=dev --workspace=api --include-workspace-root --ignore-scripts

WORKDIR /app/apps/api

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

EXPOSE 4000

COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "--enable-source-maps", "dist/src/main.js"]
