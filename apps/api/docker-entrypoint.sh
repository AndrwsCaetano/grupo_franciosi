#!/bin/sh
# Entrypoint de produção:
#   1. aguarda o Postgres estar saudável (compose já garante via depends_on).
#   2. roda `prisma migrate deploy` para aplicar migrations pendentes.
#   3. roda `prisma db seed` (idempotente — só faz upsert).
#   4. inicia a API.
set -eu

cd /app/apps/api

echo "[entrypoint] aplicando migrations..."
npx prisma migrate deploy

echo "[entrypoint] rodando seed (idempotente)..."
# RUN_SEED=0 desabilita o seed em produção depois do primeiro deploy.
if [ "${RUN_SEED:-1}" = "1" ]; then
  npx prisma db seed || echo "[entrypoint] seed falhou (ignorado), continuando..."
else
  echo "[entrypoint] RUN_SEED=0 — seed pulado."
fi

echo "[entrypoint] iniciando API: $@"
exec "$@"
