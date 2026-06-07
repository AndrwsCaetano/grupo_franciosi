#!/usr/bin/env bash
# Bootstrap idempotente do Superset (rodado pelo serviço `superset-init`):
#   1. aplica/atualiza o schema de metadados.
#   2. cria (ou atualiza) o usuário admin — também usado como service account
#      pela API NestJS para gerar guest tokens.
#   3. inicializa roles e permissões padrão.
set -e

echo "[superset-init] aplicando migrations do metadado..."
superset db upgrade

echo "[superset-init] criando/atualizando usuário admin..."
superset fab create-admin \
  --username "${SUPERSET_ADMIN_USERNAME:-admin}" \
  --firstname Admin \
  --lastname Superset \
  --email "${SUPERSET_ADMIN_EMAIL:-admin@local.dev}" \
  --password "${SUPERSET_ADMIN_PASSWORD}" || true

echo "[superset-init] inicializando roles e permissões..."
superset init

echo "[superset-init] concluído."
