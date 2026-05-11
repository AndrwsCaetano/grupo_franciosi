#!/usr/bin/env bash
# Gera deploy/Caddyfile.local a partir de .env.production (CADDY_*).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Falta $ENV_FILE — rode scripts/prepare-env-production.sh primeiro."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${CADDY_ADMIN_DOMAIN:-}" ]]; then
  echo "Defina CADDY_ADMIN_DOMAIN em $ENV_FILE (domínio do painel com DNS apontando para esta VPS)."
  exit 1
fi

mkdir -p deploy
OUT=deploy/Caddyfile.local

{
  echo "${CADDY_ADMIN_DOMAIN} {"
  echo "    reverse_proxy web:80"
  echo "}"
  if [[ -n "${CADDY_PWA_DOMAIN:-}" ]]; then
    echo "${CADDY_PWA_DOMAIN} {"
    echo "    reverse_proxy pwa:80"
    echo "}"
  fi
} > "$OUT"

echo "Gerado $OUT"
