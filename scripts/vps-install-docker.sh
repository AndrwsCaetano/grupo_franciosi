#!/usr/bin/env bash
# Instala Docker Engine + Compose plugin em Ubuntu (recomendado na VPS).
# Uso: curl -fsSL ... | bash   OU   sudo bash scripts/vps-install-docker.sh
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Execute com sudo: sudo bash scripts/vps-install-docker.sh"
  exit 1
fi

if command -v docker &>/dev/null; then
  echo "Docker já instalado: $(docker --version)"
  exit 0
fi

apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# shellcheck source=/dev/null
. /etc/os-release
CODENAME="${VERSION_CODENAME:-}"
if [[ -z "$CODENAME" ]]; then
  echo "Não foi possível detectar VERSION_CODENAME. Use Ubuntu LTS na VPS."
  exit 1
fi

arch="$(dpkg --print-architecture)"
echo "deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "Docker instalado: $(docker --version)"
if [[ -n "${SUDO_USER:-}" ]]; then
  usermod -aG docker "$SUDO_USER" && echo "Usuário $SUDO_USER adicionado ao grupo docker (faça logout/login)."
fi

echo ""
echo "Firewall sugerido (ajuste se SSH não for porta 22):"
echo "  ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable"
