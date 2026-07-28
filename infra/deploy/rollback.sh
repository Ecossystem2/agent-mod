#!/usr/bin/env bash
# =============================================================================
# rollback.sh — reverte o tráfego pra cor ANTERIOR (gravada por switch.sh).
#
# Lê infra/deploy/.last-active (escrito no último switch), valida que a cor
# anterior ainda está saudável e re-aponta o nginx pra ela. NÃO derruba a cor
# com problema (deixe-a de pé pra inspeção).
#
# Uso: infra/deploy/rollback.sh
# =============================================================================
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
load_deploy_env

STATE_FILE="$REPO_ROOT/infra/deploy/.last-active"

[ -f "$STATE_FILE" ] || die "sem $STATE_FILE — nenhum switch anterior pra reverter."

PREVIOUS="$(cat "$STATE_FILE")"
require_color "$PREVIOUS"

CURRENT="$("$REPO_ROOT/infra/deploy/active-color.sh" 2>/dev/null || true)"
if [ "$CURRENT" = "$PREVIOUS" ]; then
  warn "cor ativa já é '$PREVIOUS' — nada a reverter."
  exit 0
fi

log "rollback: '$CURRENT' -> '$PREVIOUS'"

# A cor anterior ainda deve estar de pé (não a derrubamos no deploy). Confirma saúde.
prev_port="$(api_port_of "$PREVIOUS")"
if ! health_check "http://localhost:${prev_port}/health" 5 2; then
  die "cor anterior '$PREVIOUS' não respondeu saudável — rollback inseguro. Investigue manualmente."
fi

ln -sfn "$NGINX_SITES_AVAILABLE/${PREVIOUS}.conf" "$NGINX_ACTIVE_LINK"
if ! nginx -t; then
  err "nginx -t falhou no rollback; revertendo symlink pra '$CURRENT'"
  [ -n "$CURRENT" ] && ln -sfn "$NGINX_SITES_AVAILABLE/${CURRENT}.conf" "$NGINX_ACTIVE_LINK"
  die "config nginx inválida durante rollback"
fi

nginx -s reload
ok "rollback concluído — tráfego de volta pra '$PREVIOUS'"
