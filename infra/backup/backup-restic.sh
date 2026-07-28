#!/usr/bin/env bash
# =============================================================================
# backup-restic.sh — backup do Postgres (via docker exec) + volumes → Restic/B2.
#
# Adaptado pra containers: o Postgres NÃO roda no host, então o dump sai via
# `docker exec` no container `apps-postgres`. O dump e o tar de uploads são
# enviados ao restic por STDIN (sem arquivo intermediário em disco).
#
# Faz:
#   1. lock file (evita execuções concorrentes — timer + pré-deploy)
#   2. pg_dumpall via docker exec → restic backup --stdin (snapshot do banco)
#   3. tar dos uploads (se houver) → restic backup --stdin
#   4. retenção: forget --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
#   5. restic check (integridade)
#   6. on-error hook (notificação)
#
# Variáveis (carregadas de infra/backup/b2-credentials.env se existir):
#   RESTIC_REPOSITORY, RESTIC_PASSWORD,
#   B2_ACCOUNT_ID, B2_ACCOUNT_KEY
#   PG_CONTAINER (default apps-postgres), PG_SUPERUSER (default postgres)
#   UPLOADS_DIR (opcional; default vazio = pula), BACKUP_NOTIFY_CMD (opcional)
#   BACKUP_STATUS_FILE (default /tmp/restic-backup.last-success)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRED_FILE="$SCRIPT_DIR/b2-credentials.env"
LOCK_FILE="${BACKUP_LOCK_FILE:-/tmp/restic-backup.lock}"
STATUS_FILE="${BACKUP_STATUS_FILE:-/tmp/restic-backup.last-success}"

log()  { printf '[backup %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
err()  { printf '[backup %s] ERRO: %s\n' "$(date +%H:%M:%S)" "$*" >&2; }

# ---- notificação de erro (hook) ----
notify_failure() {
  local msg="$1"
  err "$msg"
  if [ -n "${BACKUP_NOTIFY_CMD:-}" ]; then
    # BACKUP_NOTIFY_CMD recebe a mensagem como $1. Falha do hook não mascara o erro original.
    sh -c "$BACKUP_NOTIFY_CMD" _ "$msg" || err "hook de notificação falhou"
  fi
}

# Em qualquer erro, dispara o hook e propaga o código de saída.
trap 'rc=$?; [ $rc -ne 0 ] && notify_failure "backup falhou (rc=$rc) na linha $LINENO"; exit $rc' ERR

# ---- credenciais ----
if [ -f "$CRED_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; . "$CRED_FILE"; set +a
fi
: "${PG_CONTAINER:=apps-postgres}"
: "${PG_SUPERUSER:=postgres}"
: "${UPLOADS_DIR:=}"

# Falhas abaixo saem com rc!=0 → o trap ERR dispara notify_failure (notificação
# única; não chame notify_failure aqui pra evitar alerta duplicado).
for v in RESTIC_REPOSITORY RESTIC_PASSWORD; do
  [ -n "${!v:-}" ] || { err "variável $v ausente (configure infra/backup/b2-credentials.env)"; exit 1; }
done

# ---- lock (idempotência/concorrência) ----
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  err "outro backup em andamento ($LOCK_FILE). Abortando."
  exit 0
fi

command -v restic >/dev/null || { err "restic não instalado no host"; exit 1; }
docker inspect "$PG_CONTAINER" >/dev/null 2>&1 || { err "container $PG_CONTAINER não encontrado"; exit 1; }

# ---- inicializa repo se ainda não existe (idempotente) ----
if ! restic cat config >/dev/null 2>&1; then
  log "inicializando repositório restic em $RESTIC_REPOSITORY"
  restic init
fi

# ---- 1. dump do Postgres via docker exec → restic stdin ----
log "dump do Postgres ($PG_CONTAINER) → restic"
docker exec "$PG_CONTAINER" pg_dumpall -U "$PG_SUPERUSER" \
  | restic backup --stdin --stdin-filename "pgdumpall.sql" --tag db --host "${BACKUP_HOST:-$(hostname)}"
log "snapshot do banco concluído"

# ---- 2. uploads/volumes (opcional) ----
if [ -n "$UPLOADS_DIR" ] && [ -d "$UPLOADS_DIR" ]; then
  log "backup de uploads ($UPLOADS_DIR) → restic"
  tar -C "$UPLOADS_DIR" -cf - . \
    | restic backup --stdin --stdin-filename "uploads.tar" --tag uploads --host "${BACKUP_HOST:-$(hostname)}"
  log "snapshot de uploads concluído"
else
  log "UPLOADS_DIR não definido ou inexistente — pulando uploads"
fi

# ---- 3. retenção + prune ----
log "aplicando retenção (14 daily / 8 weekly / 12 monthly) + prune"
restic forget --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune

# ---- 4. verificação de integridade ----
log "restic check"
restic check

mkdir -p "$(dirname "$STATUS_FILE")"
date +%s > "$STATUS_FILE"

log "backup concluído com sucesso"
