#!/usr/bin/env bash
# =============================================================================
# active-color.sh — imprime a cor ATIVA lendo o symlink do nginx.
#
# O symlink NGINX_ACTIVE_LINK aponta pra blue.conf ou green.conf. Resolvemos o
# alvo e extraímos a cor do nome do arquivo.
#
# Saída: "blue" | "green" | "" (vazio se nenhum link/cor reconhecível).
# Sai 0 sempre que conseguir determinar algo; 1 se não há cor ativa.
#
# Uso:
#   ACTIVE=$(infra/deploy/active-color.sh)
#   IDLE=$(infra/deploy/active-color.sh --idle)   # imprime a cor OPOSTA
# =============================================================================
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
load_deploy_env

active=""
if [ -L "$NGINX_ACTIVE_LINK" ]; then
  target="$(readlink -f "$NGINX_ACTIVE_LINK" 2>/dev/null || readlink "$NGINX_ACTIVE_LINK")"
  case "$(basename "$target")" in
    blue.conf)  active="blue" ;;
    green.conf) active="green" ;;
  esac
fi

if [ "${1:-}" = "--idle" ]; then
  case "$active" in
    blue)  echo "green" ;;
    green) echo "blue" ;;
    # Sem cor ativa ainda: blue é a primeira cor por convenção.
    *)     echo "blue" ;;
  esac
  exit 0
fi

if [ -z "$active" ]; then
  warn "nenhuma cor ativa detectada em $NGINX_ACTIVE_LINK"
  exit 1
fi
echo "$active"
