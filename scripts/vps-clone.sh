#!/usr/bin/env bash
# Clona ou atualiza o repositório na VPS.
# Uso: GF_GIT_URL=https://github.com/org/grupo_franciosi.git ./scripts/vps-clone.sh
set -euo pipefail

: "${GF_GIT_URL:?Defina GF_GIT_URL com a URL git do projeto}"

DIR="${GF_CLONE_DIR:-$HOME/grupo_franciosi}"

if [[ -d "$DIR/.git" ]]; then
  echo "Atualizando $DIR ..."
  git -C "$DIR" pull --ff-only
else
  echo "Clonando para $DIR ..."
  git clone "$GF_GIT_URL" "$DIR"
fi

echo "Próximo: cd \"$DIR\" && ./scripts/prepare-env-production.sh"
