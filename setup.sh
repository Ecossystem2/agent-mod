#!/usr/bin/env bash
# =============================================================================
# setup.sh — bootstrap de deploy em 1 comando
#
# Faz, de forma interativa:
#   1. Pergunta domínio base, subdomínios (app/api + extras) e e-mail ACME
#   2. Gera apps/api/.env e apps/web/.env já coerentes pra subdomínios
#      separados (secrets via openssl, CORS/origins/cookies corretos)
#   3. Gera o Caddyfile (HTTPS automático via Let's Encrypt) com uma rota
#      por subdomínio + rotas extras (minio, grafana, etc)
#   4. Gera docker-compose.caddy.yml (serviço caddy: 80/443)
#   5. Chama o ./deploy.sh (build → infra → migrations → api → web → caddy)
#
# Uso:
#   ./setup.sh            # bootstrap interativo
#   ./setup.sh --force    # sobrescreve .env / Caddyfile já existentes
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

# ---- pré-requisitos ----
command -v openssl >/dev/null || { echo "ERRO: openssl não encontrado." >&2; exit 1; }
command -v docker  >/dev/null || { echo "ERRO: docker não encontrado." >&2; exit 1; }

API_ENV="apps/api/.env"
WEB_ENV="apps/web/.env"
CADDYFILE="Caddyfile"
CADDY_COMPOSE="docker-compose.caddy.yml"

guard_overwrite() {
    local f="$1"
    if [ -f "$f" ] && [ "$FORCE" -ne 1 ]; then
        echo "ERRO: $f já existe. Use --force pra sobrescrever (ele será salvo como $f.bak)." >&2
        exit 1
    fi
    [ -f "$f" ] && cp "$f" "$f.bak"
}

ask() { # ask <var> <prompt> <default>
    local __var="$1" __prompt="$2" __default="${3:-}" __ans
    if [ -n "$__default" ]; then
        read -rp "$__prompt [$__default]: " __ans
        __ans="${__ans:-$__default}"
    else
        read -rp "$__prompt: " __ans
    fi
    printf -v "$__var" '%s' "$__ans"
}

echo "=== Bootstrap de deploy ==="
echo

ask BASE_DOMAIN  "Domínio base (ex: seuapp.com)"
[ -n "$BASE_DOMAIN" ] || { echo "ERRO: domínio base é obrigatório." >&2; exit 1; }

# Nome do projeto isola containers/volumes/redes de outros apps na mesma VPS.
DEFAULT_SLUG="$(printf '%s' "${BASE_DOMAIN%%.*}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')"
ask PROJECT "Nome do projeto (isola containers/volumes na VPS)" "${DEFAULT_SLUG:-app}"
ask APP_SUB      "Subdomínio do front" "app"
ask API_SUB      "Subdomínio da API"   "api"
ask ACME_EMAIL   "E-mail pro Let's Encrypt (avisos de expiração)"
[ -n "$ACME_EMAIL" ] || { echo "ERRO: e-mail ACME é obrigatório." >&2; exit 1; }

APP_DOMAIN="${APP_SUB}.${BASE_DOMAIN}"
API_DOMAIN="${API_SUB}.${BASE_DOMAIN}"

ask DB_USER "Usuário do Postgres" "postgres"
ask DB_NAME "Banco do Postgres"   "template"
read -rp "Senha do Postgres [gerar automática]: " DB_PASS
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"

# ---- rotas extras (minio, grafana, etc) ----
EXTRA_ROUTES=()
echo
echo "Rotas extras (minio, grafana, etc). Enter vazio no subdomínio pra terminar."
while true; do
    read -rp "  Subdomínio extra (ex: grafana): " EX_SUB
    [ -z "$EX_SUB" ] && break
    read -rp "  Upstream (host:porta no compose, ex: grafana:3000): " EX_UP
    [ -z "$EX_UP" ] && { echo "  upstream vazio, ignorando."; continue; }
    EXTRA_ROUTES+=("${EX_SUB}.${BASE_DOMAIN}|${EX_UP}")
    echo "  + ${EX_SUB}.${BASE_DOMAIN} → ${EX_UP}"
done

AUTH_SECRET="$(openssl rand -base64 32)"
WEBHOOK_SECRET="$(openssl rand -hex 32)"

echo
echo "Resumo:"
echo "  projeto: ${PROJECT} (containers/volumes isolados nesta VPS)"
echo "  front : https://${APP_DOMAIN}  → web:8080"
echo "  api   : https://${API_DOMAIN}  → api:3333"
for r in "${EXTRA_ROUTES[@]}"; do echo "  extra : https://${r%%|*}  → ${r##*|}"; done
echo
read -rp "Confirma e gera os arquivos? [s/N]: " OK
[ "${OK,,}" = "s" ] || { echo "Abortado."; exit 0; }

# ---- gera apps/api/.env ----
guard_overwrite "$API_ENV"
cat > "$API_ENV" <<EOF
# Gerado por setup.sh — subdomínios separados (${APP_DOMAIN} + ${API_DOMAIN})
COMPOSE_PROJECT_NAME=${PROJECT}
NODE_ENV=production
PORT=3333
LOG_LEVEL=info

POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=${DB_NAME}
POSTGRES_PORT=5432
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@postgres:5432/${DB_NAME}?schema=public

REDIS_PORT=6379
REDIS_URL=redis://redis:6379

AUTH_SECRET=${AUTH_SECRET}
AUTH_BASE_URL=https://${API_DOMAIN}
AUTH_TRUSTED_ORIGINS=https://${APP_DOMAIN}
SECURE_COOKIES=true

CORS_ALLOWED_ORIGINS=https://${APP_DOMAIN}

THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=100
THROTTLE_IP_LIMIT=1000

STORAGE_DRIVER=disk

MAIL_ENABLED=false

WEBHOOK_SECRET=${WEBHOOK_SECRET}

API_PORT=3333
EOF
echo "  ok  $API_ENV"

# ---- gera apps/web/.env ----
guard_overwrite "$WEB_ENV"
cat > "$WEB_ENV" <<EOF
# Gerado por setup.sh — origin da API (injetado em build time pelo Vite)
VITE_API_BASE_URL=https://${API_DOMAIN}
WEB_PORT=8080
EOF
echo "  ok  $WEB_ENV"

# ---- gera Caddyfile ----
guard_overwrite "$CADDYFILE"
{
    echo "# Gerado por setup.sh — HTTPS automático (Let's Encrypt)"
    echo "{"
    echo "    email ${ACME_EMAIL}"
    echo "}"
    echo
    echo "${APP_DOMAIN} {"
    echo "    reverse_proxy web:8080"
    echo "}"
    echo
    echo "${API_DOMAIN} {"
    echo "    reverse_proxy api:3333"
    echo "}"
    for r in "${EXTRA_ROUTES[@]}"; do
        echo
        echo "${r%%|*} {"
        echo "    reverse_proxy ${r##*|}"
        echo "}"
    done
} > "$CADDYFILE"
echo "  ok  $CADDYFILE"

# ---- gera docker-compose.caddy.yml ----
guard_overwrite "$CADDY_COMPOSE"
cat > "$CADDY_COMPOSE" <<'EOF'
# Gerado por setup.sh — reverse proxy + TLS automático.
# Sobe junto via deploy.sh (que detecta este arquivo).
#
# Com o Caddy na frente, os serviços internos NÃO publicam porta no host
# (só existem na rede do projeto). Isso evita colisão de 5432/6379/3333/8080
# com outros projetos da VPS. `!reset []` remove os ports herdados do base.
# Requer Docker Compose v2.24+ (o `!reset`).
services:
  postgres:
    ports: !reset []
  redis:
    ports: !reset []
  api:
    ports: !reset []
  web:
    ports: !reset []

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      - api
      - web

volumes:
  caddy-data:
  caddy-config:
EOF
echo "  ok  $CADDY_COMPOSE"

echo
echo "Arquivos gerados. Aponte os DNS (A/AAAA) pro IP deste host:"
echo "  ${APP_DOMAIN}, ${API_DOMAIN}$(for r in "${EXTRA_ROUTES[@]}"; do printf ', %s' "${r%%|*}"; done)"
echo
read -rp "Rodar o deploy agora (./deploy.sh)? [s/N]: " RUN
[ "${RUN,,}" = "s" ] || { echo "Pronto. Rode ./deploy.sh quando o DNS propagar."; exit 0; }
exec ./deploy.sh
