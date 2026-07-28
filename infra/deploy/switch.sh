#!/usr/bin/env bash
# =============================================================================
# switch.sh <cor> — aponta o tráfego do nginx pra <cor> (zero-downtime).
#
# Faz:
#   1. guarda a cor atual em .last-active (pra rollback.sh)
#   2. aponta o symlink NGINX_ACTIVE_LINK -> sites-available/<cor>.conf
#   3. nginx -t (valida config) && nginx -s reload (sem derrubar conexões)
#
# Se o `nginx -t` falhar, reverte o symlink e aborta — não recarrega config quebrada.
#
# Requer permissão de escrita em sites-enabled e de reload do nginx (rode como
# root ou via sudo na VPS).
#
# Uso: infra/deploy/switch.sh green
# =============================================================================
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

COLOR="${1:-}"
require_color "$COLOR"
load_deploy_env

TARGET_CONF="$NGINX_SITES_AVAILABLE/${COLOR}.conf"
STATE_FILE="$REPO_ROOT/infra/deploy/.last-active"

[ -f "$TARGET_CONF" ] || die "conf da cor não encontrada: $TARGET_CONF (instale os confs — ver infra/nginx/README.md)"

# Cor atual (pode ser vazio no primeiríssimo switch).
PREVIOUS="$("$REPO_ROOT/infra/deploy/active-color.sh" 2>/dev/null || true)"

log "switch: '${PREVIOUS:-<nenhuma>}' -> '$COLOR'"

# 1. grava cor anterior pra rollback
if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$COLOR" ]; then
  echo "$PREVIOUS" > "$STATE_FILE"
fi

# 2. aponta o symlink (atômico via ln -sfn)
ln -sfn "$TARGET_CONF" "$NGINX_ACTIVE_LINK"

# 3. valida e recarrega; reverte se inválido
if ! nginx -t; then
  err "nginx -t falhou; revertendo symlink"
  if [ -n "$PREVIOUS" ]; then
    ln -sfn "$NGINX_SITES_AVAILABLE/${PREVIOUS}.conf" "$NGINX_ACTIVE_LINK"
  else
    rm -f "$NGINX_ACTIVE_LINK"
  fi
  die "config nginx inválida; nada recarregado"
fi

nginx -s reload
ok "tráfego agora aponta pra '$COLOR'"
