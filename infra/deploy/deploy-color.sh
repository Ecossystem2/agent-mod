#!/usr/bin/env bash
# =============================================================================
# deploy-color.sh <cor> [tag] — sobe (ou recria) uma cor e a deixa healthy.
#
# Faz, para a cor alvo (tipicamente a IDLE):
#   1. garante shared (postgres+redis) de pé e healthy
#   2. baixa (pull) as imagens api+web já buildadas no CI
#   3. up -d api web da cor sem rebuild local
#   4. migrations: prisma migrate deploy DENTRO do container da api da cor
#   5. health-check GET /health na porta host da cor
#
# NÃO troca o tráfego — isso é trabalho do switch.sh. Aqui só preparamos a cor.
#
# Uso:
#   infra/deploy/deploy-color.sh green v1.4.2
#   infra/deploy/deploy-color.sh blue           # tag = latest
# =============================================================================
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

COLOR="${1:-}"
TAG="${2:-latest}"

require_color "$COLOR"
require_envs
load_deploy_env

export IMAGE_TAG="$TAG"

log "deploy da cor '$COLOR' (tag '$TAG')"

# 1. shared de pé e healthy PRIMEIRO (cria a rede externa apps-net que a cor usa)
log "[1/4] garantindo shared (postgres+redis) e a rede apps-net"
shared_compose up -d postgres redis

log "    aguardando postgres healthy"
container_health_check apps-postgres

# 2. pull + up da cor (sem build local; artefato vem do registry)
log "[2/4] pull + up da api+web da cor '$COLOR'"
compose_for "$COLOR" pull api web
compose_for "$COLOR" up -d --no-build api web

# 3. migrations dentro do container da api da cor
log "[3/4] rodando migrations (prisma migrate deploy) na api '$COLOR'"
compose_for "$COLOR" exec -T api pnpm exec prisma migrate deploy

# 4. health-check
local_port="$(api_port_of "$COLOR")"  # variável de script (não 'local'; estamos fora de função)
log "[4/4] health-check da cor '$COLOR'"
if ! health_check "http://localhost:${local_port}/health"; then
  err "cor '$COLOR' não ficou saudável. Logs:"
  compose_for "$COLOR" logs --tail 50 api >&2 || true
  die "deploy-color abortado"
fi

ok "cor '$COLOR' pronta e saudável (porta host ${local_port}). Pronta pra switch."
