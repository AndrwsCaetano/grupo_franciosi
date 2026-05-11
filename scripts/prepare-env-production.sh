#!/usr/bin/env bash
# Cria .env.production a partir do exemplo se ainda não existir.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.production ]]; then
  echo ".env.production já existe em $ROOT (não sobrescrito)."
  exit 0
fi

cp .env.production.example .env.production
echo "Criado .env.production — edite JWT_SECRET, senhas, CORS_ORIGIN e domínios Caddy (se usar HTTPS)."
