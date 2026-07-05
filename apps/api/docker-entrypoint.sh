#!/bin/sh
# Entrypoint de produção:
#   1. aguarda o Postgres estar saudável (compose já garante via depends_on).
#   2. roda `prisma migrate deploy` para aplicar migrations pendentes.
#   3. sincroniza opções do catálogo shared (sempre, mesmo com RUN_SEED=0).
#   4. roda `prisma db seed` completo se RUN_SEED=1.
#   5. inicia a API.
set -eu

cd /app/apps/api

echo "[entrypoint] aplicando migrations..."
npx prisma migrate deploy

echo "[entrypoint] sincronizando permissões do catálogo shared..."
npx tsx prisma/sync-permissions.ts || echo "[entrypoint] sync-permissions falhou (ignorado), continuando..."

echo "[entrypoint] rodando seed (idempotente)..."
# RUN_SEED=0 desabilita o seed completo em produção depois do primeiro deploy.
if [ "${RUN_SEED:-1}" = "1" ]; then
  npx prisma db seed || echo "[entrypoint] seed falhou (ignorado), continuando..."
else
  echo "[entrypoint] RUN_SEED=0 — seed completo pulado (permissões já sincronizadas)."
fi

echo "[entrypoint] iniciando API: $@"
exec "$@"
