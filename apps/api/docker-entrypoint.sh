#!/bin/sh
# Entrypoint de produção:
#   1. aplica migrations (`prisma migrate deploy`).
#   2. sincroniza opções do catálogo shared (sempre, mesmo com RUN_SEED=0).
#      -> em caso de falha, imprime banner de erro destacado mas segue
#         subindo a API (evita brickar o painel por erro transitório).
#      -> em caso de sucesso, o próprio script já loga um resumo (total de
#         opções no DB e presença das `fuel_station.*`), fácil de achar
#         em `docker logs api | grep sync-permissions`.
#   3. roda `prisma db seed` completo se RUN_SEED=1.
#   4. inicia a API.
set -eu

cd /app/apps/api

echo "[entrypoint] aplicando migrations..."
npx prisma migrate deploy

echo "[entrypoint] sincronizando permissões do catálogo shared..."
set +e
npx tsx prisma/sync-permissions.ts
SYNC_EXIT=$?
set -e
if [ "$SYNC_EXIT" -ne 0 ]; then
  echo "########################################################################"
  echo "# [entrypoint] ATENÇÃO: sync-permissions falhou (exit=$SYNC_EXIT)."
  echo "# A API sobe mesmo assim, mas o menu 'Perfis' pode ficar sem opções"
  echo "# novas (ex.: fuel_station.*). Rode manualmente para investigar:"
  echo "#   docker compose -f docker-compose.prod.yml --env-file .env.production \\"
  echo "#     exec api npx tsx prisma/sync-permissions.ts"
  echo "########################################################################"
fi

echo "[entrypoint] rodando seed (idempotente)..."
# RUN_SEED=0 desabilita o seed completo em produção depois do primeiro deploy.
if [ "${RUN_SEED:-1}" = "1" ]; then
  npx prisma db seed || echo "[entrypoint] seed falhou (ignorado), continuando..."
else
  echo "[entrypoint] RUN_SEED=0 — seed completo pulado (permissões já sincronizadas)."
fi

echo "[entrypoint] iniciando API: $@"
exec "$@"
