#!/usr/bin/env bash
# Sobe a stack de produção (Postgres + API + web + pwa).
# USE_CADDY=1 — inclui Caddy (rode scripts/prepare-caddyfile.sh antes).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Falta $ENV_FILE — rode: ./scripts/prepare-env-production.sh"
  exit 1
fi

COMPOSE_FILES=(-f docker-compose.prod.yml)

if [[ "${USE_CADDY:-0}" == "1" ]]; then
  if [[ ! -f deploy/Caddyfile.local ]]; then
    echo "Com USE_CADDY=1 é preciso gerar deploy/Caddyfile.local — rode: ./scripts/prepare-caddyfile.sh"
    exit 1
  fi
  COMPOSE_FILES+=(-f docker-compose.caddy.yml)
fi

docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE" up -d --build "$@"
