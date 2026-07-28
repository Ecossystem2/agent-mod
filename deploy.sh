#!/usr/bin/env bash
# =============================================================================
# deploy.sh — pipeline completo de deploy via docker-compose
#
# Faz, em ordem:
#   1. Valida que apps/api/.env e apps/web/.env existem
#   2. Build das imagens (api + web)
#   3. Sobe postgres + redis e espera ficarem healthy
#   4. Roda migrations (container one-off, para que seed_history já exista)
#   5. Menu interativo de seeds (se TTY e não --skip-seeds)
#   6. Sobe api + web (+ caddy se configurado)
#   7. Mostra status final
#
# IMPORTANTE: este script NUNCA lê .env da raiz do projeto.
# Toda env vem de apps/api/.env e apps/web/.env.
#
# Uso:
#   ./deploy.sh               # deploy completo (menu de seeds se TTY)
#   ./deploy.sh --rebuild     # força rebuild sem cache
#   ./deploy.sh --skip-seeds  # pula o menu de seeds
# =============================================================================
set -euo pipefail

# Corepack não pode pedir confirmação de download no deploy não-interativo.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

cd "$(dirname "$0")"

# ---- 0. Sync com remote ----
# Servidor de deploy deve sempre refletir o remote. Descarta divergências locais.
echo "==> [0/5] Syncing with remote"
git fetch origin
git reset --hard origin/"$(git branch --show-current)"

API_ENV="apps/api/.env"
WEB_ENV="apps/web/.env"

# ---- 1. Validar envs ----
fail=0
if [ ! -f "$API_ENV" ]; then
    echo "ERRO: $API_ENV não existe. Copie de apps/api/.env.example." >&2
    fail=1
fi
if [ ! -f "$WEB_ENV" ]; then
    echo "ERRO: $WEB_ENV não existe. Copie de apps/web/.env.example." >&2
    fail=1
fi
if [ "$fail" -eq 1 ]; then exit 1; fi

if [ ! -f "pnpm-lock.yaml" ]; then
    echo "ERRO: pnpm-lock.yaml não existe. Rode 'pnpm install' uma vez antes do primeiro deploy." >&2
    exit 1
fi

# Nome do projeto compose isola containers/volumes/redes deste app dos outros
# que rodem na mesma VPS. Vem de COMPOSE_PROJECT_NAME em apps/api/.env (o
# setup.sh grava); fallback "template".
PROJECT="$(grep -E '^COMPOSE_PROJECT_NAME=' "$API_ENV" 2>/dev/null | head -1 | cut -d= -f2- || true)"
PROJECT="${PROJECT:-template}"

# Compose precisa dos dois env files pra substituição de ${VAR} no compose.yml
# (build args do web vêm daqui).
COMPOSE=(docker compose -p "$PROJECT" --env-file "$API_ENV" --env-file "$WEB_ENV")

# Reverse proxy (Caddy) é opcional: o setup.sh gera docker-compose.caddy.yml.
# Se existir, incluímos o override e subimos o caddy no fim.
CADDY=0
if [ -f "docker-compose.caddy.yml" ]; then
    COMPOSE+=(-f docker-compose.yml -f docker-compose.caddy.yml)
    CADDY=1
fi

BUILD_FLAGS=()
SKIP_SEEDS=0
for arg in "$@"; do
    case "$arg" in
        --rebuild)    BUILD_FLAGS+=(--no-cache --pull) ;;
        --skip-seeds) SKIP_SEEDS=1 ;;
    esac
done

# ---- 2. Build ----
echo "==> [1/5] Building images"
"${COMPOSE[@]}" build "${BUILD_FLAGS[@]}"

# ---- 3. Infra (postgres + redis) ----
echo "==> [2/5] Starting postgres + redis"
"${COMPOSE[@]}" up -d postgres redis

# Resolve o id do container pelo serviço compose (agnóstico a nome/projeto).
wait_healthy() { # wait_healthy <service> <tries>
    local svc="$1" tries="$2" cid st
    echo "    waiting for $svc healthy..."
    for _ in $(seq 1 "$tries"); do
        cid=$("${COMPOSE[@]}" ps -q "$svc" 2>/dev/null || true)
        if [ -n "$cid" ]; then
            st=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "starting")
            if [ "$st" = "healthy" ]; then return 0; fi
        fi
        sleep 2
    done
    echo "ERRO: $svc não ficou healthy a tempo." >&2
    "${COMPOSE[@]}" logs "$svc" | tail -50
    return 1
}

wait_healthy postgres 60
wait_healthy redis 30 || true

# ---- 4. Migrations (one-off, antes da API subir) ----
echo "==> [3/5] Running migrations"
"${COMPOSE[@]}" run --rm api sh -c "pnpm exec prisma migrate deploy"

# ---- 5. Seeds (interativo, opcional) ----
if [ "$SKIP_SEEDS" -eq 1 ]; then
    echo "==> [4/5] Seeds (ignorados via --skip-seeds)"
elif [ -t 0 ]; then
    echo "==> [4/5] Seeds"
    "${COMPOSE[@]}" run --rm -it api sh -c "pnpm exec tsx prisma/seed-runner.ts"
else
    echo "==> [4/5] Seeds (sem TTY — ignorados; rode manualmente: pnpm --filter @apps/api prisma:seed:interactive)"
fi

# ---- 6. API + Web ----
echo "==> [5/5] Starting api + web"
"${COMPOSE[@]}" up -d api web

# ---- 5b. Caddy (reverse proxy + TLS) ----
if [ "$CADDY" -eq 1 ]; then
    # Caddy precisa de 80/443 no host. Se outro processo (outro proxy/projeto)
    # já estiver ouvindo, abortamos com instrução em vez de falhar feio.
    port_busy() { # port_busy <port>
        local p="$1" mine
        # Containers DESTE projeto que já publicam a porta não contam como conflito.
        mine=$("${COMPOSE[@]}" ps -q caddy 2>/dev/null || true)
        if command -v ss >/dev/null;   then ss -ltn  2>/dev/null | grep -qE "[:.]$p\b" && [ -z "$mine" ]; return; fi
        if command -v netstat >/dev/null; then netstat -ltn 2>/dev/null | grep -qE "[:.]$p\b" && [ -z "$mine" ]; return; fi
        return 1
    }
    if port_busy 80 || port_busy 443; then
        echo "ERRO: porta 80 e/ou 443 já está em uso nesta VPS (outro proxy/projeto)." >&2
        echo "      Opções:" >&2
        echo "        - pare o processo que ocupa 80/443; ou" >&2
        echo "        - não use o Caddy deste projeto: apague docker-compose.caddy.yml e" >&2
        echo "          conecte api/web ao proxy existente via rede externa compartilhada." >&2
        echo "      api/web já estão de pé na rede interna do projeto '$PROJECT'." >&2
        exit 1
    fi
    echo "==> Starting caddy (reverse proxy + HTTPS)"
    "${COMPOSE[@]}" up -d caddy
fi

# ---- 6. Status ----
echo ""
echo "==> Done. Status:"
"${COMPOSE[@]}" ps

echo ""
echo "Logs:    docker compose --env-file $API_ENV --env-file $WEB_ENV logs -f"
echo "Stop:    docker compose --env-file $API_ENV --env-file $WEB_ENV down"
