# syntax=docker/dockerfile:1
#
# Imagem da API NestJS para produção.
#
# Estágios:
#   1. deps    — instala TODAS as dependências do monorepo (npm workspaces).
#   2. builder — builda o pacote @grupo-franciosi/shared e a API (Nest).
#   3. runner  — imagem final com Oracle Instant Client + Node + dist.
#
# Importante: o Instant Client é embutido na imagem (TARGETARCH=amd64). Para
# servidores ARM, suba sem Oracle ou pré-instale o Instant Client ARM em
# /opt/oracle/instantclient e ajuste o ENV abaixo.

############
# 1. deps
############
FROM node:22-bookworm-slim AS deps

WORKDIR /repo

# Copia somente os manifestos para tirar proveito do cache.
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web-admin/package.json apps/web-admin/
COPY packages/shared/package.json packages/shared/

# Instala todas as deps com lockfile (mais reprodutível).
# --ignore-scripts evita rodar postinstall (ex.: prisma) antes do source estar disponível.
RUN npm ci --workspaces --include-workspace-root --ignore-scripts

############
# 2. builder
############
FROM node:22-bookworm-slim AS builder

WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json /repo/package-lock.json /repo/turbo.json ./

# Source do monorepo.
COPY packages ./packages
COPY apps/api ./apps/api

# 1) Builda o pacote partilhado.
RUN npm run build -w @grupo-franciosi/shared

# 2) Gera Prisma Client e builda a API.
WORKDIR /repo/apps/api
RUN npx prisma generate && npm run build

############
# 3. runner
############
FROM node:22-bookworm-slim AS runner

ARG TARGETARCH=amd64

# Oracle Instant Client (modo Thick): suporta password verifier 12C.
# Em x86_64 baixamos o "basiclite". Em outras arquiteturas pulamos (modo thin).
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

# Copia node_modules da raiz e do workspace api (npm cria links).
COPY --from=builder /repo/node_modules /app/node_modules
COPY --from=builder /repo/package.json /repo/package-lock.json /app/

# Pacote partilhado já buildado.
COPY --from=builder /repo/packages /app/packages

# API: dist + manifests + Prisma + script de seed.
COPY --from=builder /repo/apps/api/dist /app/apps/api/dist
COPY --from=builder /repo/apps/api/node_modules /app/apps/api/node_modules
COPY --from=builder /repo/apps/api/package.json /app/apps/api/package.json
COPY --from=builder /repo/apps/api/prisma.config.ts /app/apps/api/prisma.config.ts
COPY --from=builder /repo/apps/api/prisma /app/apps/api/prisma

# Diretório de uploads (mapear como volume em produção).
RUN mkdir -p /app/apps/api/uploads

WORKDIR /app/apps/api

# Healthcheck simples — exige que /health esteja exposto e público (já está).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

EXPOSE 4000

# Entrypoint: aplica migrations + seed (idempotente) + sobe a API.
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "--enable-source-maps", "dist/src/main.js"]
