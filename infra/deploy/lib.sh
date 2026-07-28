#!/usr/bin/env bash
# =============================================================================
# infra/deploy/lib.sh — funções compartilhadas pelos scripts de blue-green.
#
# Sourced (não executado direto) pelos demais scripts:
#   source "$(dirname "$0")/lib.sh"
#
# Fornece: logging, carregamento de deploy.env, wrapper do docker compose por
# cor, e health-check com retry contra GET /health.
# =============================================================================
set -euo pipefail

# Raiz do projeto: dois níveis acima de infra/deploy/.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

API_ENV="$REPO_ROOT/apps/api/.env"
WEB_ENV="$REPO_ROOT/apps/web/.env"
DEPLOY_ENV="$REPO_ROOT/deploy.env"

SHARED_COMPOSE="$REPO_ROOT/docker-compose.shared.yml"

# ---- logging ----
log()  { printf '\033[0;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m!\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; }
die()  { err "$*"; exit 1; }

# ---- carregar deploy.env (defaults se ausente) ----
load_deploy_env() {
  if [ -f "$DEPLOY_ENV" ]; then
    # shellcheck disable=SC1090
    set -a; . "$DEPLOY_ENV"; set +a
  fi
  : "${GITHUB_REPOSITORY_OWNER:=}"
  : "${BLUE_API_PORT:=3341}"
  : "${BLUE_WEB_PORT:=8081}"
  : "${GREEN_API_PORT:=3342}"
  : "${GREEN_WEB_PORT:=8082}"
  : "${NGINX_SITES_AVAILABLE:=/etc/nginx/sites-available}"
  : "${NGINX_ACTIVE_LINK:=/etc/nginx/sites-enabled/active.conf}"
  : "${POSTGRES_HEALTHCHECK_RETRIES:=20}"
  : "${POSTGRES_HEALTHCHECK_INTERVAL:=1}"
  : "${POST_SWITCH_HEALTHCHECK_RETRIES:=20}"
  : "${POST_SWITCH_HEALTHCHECK_INTERVAL:=1}"
  : "${BACKUP_MAX_AGE_HOURS:=24}"
  : "${BACKUP_STATUS_FILE:=/tmp/restic-backup.last-success}"
  : "${HEALTHCHECK_RETRIES:=30}"
  : "${HEALTHCHECK_INTERVAL:=1}"

  case "${API_IMAGE:-}" in
    ""|apps-api)
      if [ -n "$GITHUB_REPOSITORY_OWNER" ]; then
        API_IMAGE="ghcr.io/${GITHUB_REPOSITORY_OWNER}/boilarplate-api"
      fi
      ;;
  esac

  case "${WEB_IMAGE:-}" in
    ""|apps-web)
      if [ -n "$GITHUB_REPOSITORY_OWNER" ]; then
        WEB_IMAGE="ghcr.io/${GITHUB_REPOSITORY_OWNER}/boilarplate-web"
      fi
      ;;
  esac
}

# ---- validações ----
require_color() {
  case "${1:-}" in
    blue|green) ;;
    *) die "cor inválida: '${1:-}'. Use 'blue' ou 'green'." ;;
  esac
}

require_envs() {
  [ -f "$API_ENV" ] || die "$API_ENV não existe. Copie de apps/api/.env.example."
  [ -f "$WEB_ENV" ] || die "$WEB_ENV não existe. Copie de apps/web/.env.example."
}

# ---- wrapper do docker compose por cor ----
# Uso: compose_for blue up -d api web
# IMPORTANTE: usa APENAS o arquivo da cor (projeto apps-<cor>). O postgres/redis
# vivem no projeto separado `apps-shared` (ver shared_compose) e são alcançados
# pela rede externa `apps-net`. Mesclar o shared aqui adotaria o postgres no
# projeto da cor — quebrando o modelo de infra compartilhada.
compose_for() {
  local color="$1"; shift
  local project="apps-${color}"
  COMPOSE_PROJECT_NAME="$project" docker compose \
    --env-file "$API_ENV" \
    -f "$REPO_ROOT/docker-compose.${color}.yml" \
    "$@"
}

# ---- wrapper do shared (postgres+redis), projeto apps-shared ----
shared_compose() {
  COMPOSE_PROJECT_NAME="apps-shared" docker compose \
    --env-file "$API_ENV" \
    -f "$SHARED_COMPOSE" \
    "$@"
}

# Porta host da API de uma cor (pra health-check pelo host).
api_port_of() {
  case "$1" in
    blue)  echo "$BLUE_API_PORT" ;;
    green) echo "$GREEN_API_PORT" ;;
  esac
}

# ---- health-check com retry contra GET /health ----
# Uso: health_check <url> [retries] [interval]
# Considera saudável quando o corpo contém "\"ok\":true" — que é o contrato real
# do HealthController (`{ ok: true }`). NÃO invente outro shape aqui: um match
# que não bate com o controller faz TODO deploy abortar e, pior, faz o
# rollback.sh falhar exatamente no incidente em que ele é necessário.
health_check() {
  local url="$1"
  local retries="${2:-$HEALTHCHECK_RETRIES}"
  local interval="${3:-$HEALTHCHECK_INTERVAL}"
  local attempt=1 body=""

  log "health-check em $url (até $retries tentativas, intervalo ${interval}s)"
  while [ "$attempt" -le "$retries" ]; do
    if body="$(curl -fsS --max-time 5 "$url" 2>/dev/null)"; then
      case "$body" in
        *'"ok":true'*) ok "saudável após $attempt tentativa(s)"; return 0 ;;
      esac
    fi
    printf '  tentativa %d/%d falhou; aguardando %ss...\n' "$attempt" "$retries" "$interval"
    sleep "$interval"
    attempt=$((attempt + 1))
  done
  err "health-check falhou após $retries tentativas em $url"
  return 1
}

# ---- health-check do container por estado Docker ----
# Uso: container_health_check <container> [retries] [interval]
container_health_check() {
  local container="$1"
  local retries="${2:-$POSTGRES_HEALTHCHECK_RETRIES}"
  local interval="${3:-$POSTGRES_HEALTHCHECK_INTERVAL}"
  local attempt=1
  local status=""

  log "container health-check em $container (até $retries tentativas, intervalo ${interval}s)"
  while [ "$attempt" -le "$retries" ]; do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo starting)"
    if [ "$status" = "healthy" ]; then
      ok "$container healthy após $attempt tentativa(s)"
      return 0
    fi
    printf '  tentativa %d/%d falhou; status=%s; aguardando %ss...\n' \
      "$attempt" "$retries" "$status" "$interval"
    sleep "$interval"
    attempt=$((attempt + 1))
  done
  err "container health-check falhou após $retries tentativas em $container"
  return 1
}
