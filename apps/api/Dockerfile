# syntax=docker/dockerfile:1.7

# =============================================================================
# apps/api/Dockerfile — multi-stage
# Build context: raiz do monorepo (necessário para pnpm-workspace)
# =============================================================================

FROM node:22-alpine AS base
# Sem prompt "[Y/n]" de download do corepack — trava o build/deploy não-interativo.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

# ---- Stage: install + build ----
FROM base AS build

# Manifestos primeiro (cache de install)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages packages
COPY tooling tooling

RUN pnpm install --frozen-lockfile --filter @apps/api...

# Fonte
COPY apps/api apps/api

RUN pnpm --filter @apps/api exec prisma generate
RUN pnpm --filter @apps/api run build

# ---- Stage: runtime ----
FROM base AS runtime
ENV NODE_ENV=production

# Copia o repo já buildado (mais simples que reinstalar prod-only num monorepo pnpm)
COPY --from=build /repo /repo

WORKDIR /repo/apps/api
EXPOSE 3333

# Runtime como usuário não-root (node uid 1000 já existe na imagem oficial).
# Os arquivos copiados são world-readable; node só precisa ler + executar.
USER node

# Migrations rodam no boot do container, depois sobe o servidor.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/infra/main.js"]
