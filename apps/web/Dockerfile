# syntax=docker/dockerfile:1.7

# =============================================================================
# apps/web/Dockerfile — multi-stage (vite build + nginx)
# Build context: raiz do monorepo
# Build args: VITE_API_BASE_URL (vem de apps/web/.env)
# =============================================================================

FROM node:22-alpine AS build
# Sem prompt "[Y/n]" de download do corepack — trava o build/deploy não-interativo.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages packages
COPY tooling tooling

RUN pnpm install --frozen-lockfile --filter @apps/web...

COPY apps/web apps/web

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm --filter @apps/web run build

# ---- Stage: runtime (nginx unprivileged, non-root) ----
# Imagem roda como uid 101 (nginx) e escuta em 8080 (porta não-privilegiada).
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
USER nginx
EXPOSE 8080
