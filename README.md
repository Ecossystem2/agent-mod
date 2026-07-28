# template-nest-ddd

Monorepo **NestJS + DDD + React** pré-configurado. Clone, renomeie `@apps/*` pro seu projeto e comece pelo domínio. Zero features de negócio inclusas — só infra pronta.

---

## Stack

### Backend (`apps/api/`)

| Camada | Tecnologia |
|---|---|
| Framework | NestJS 10 + TypeScript strict |
| Runtime | Node 22+ |
| ORM | Prisma 6 + Postgres 16 |
| Cache | Redis 7 |
| Queue | BullMQ |
| Auth | better-auth |
| Validação | Zod (sem class-validator) |
| Logs | Pino com redact |

### Frontend (`apps/web/`)

| Camada | Tecnologia |
|---|---|
| Bundler | Vite |
| UI | React 19 + Tailwind v3 + shadcn/ui |
| Estado servidor | TanStack Query |
| Estado UI | Zustand |
| Forms | React Hook Form + Zod |
| Roteamento | React Router v6 (data router) |

### Tooling

| | |
|---|---|
| Monorepo | pnpm workspaces + Turbo |
| Testes | Vitest (unit + e2e) |
| Lint | ESLint flat + Prettier |
| Hooks | Husky + Conventional Commits estrito |

---

## Desenvolvimento

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar envs (NUNCA na raiz — sempre nos apps)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Subir Postgres + Redis (sem build da api/web)
docker compose --env-file apps/api/.env --env-file apps/web/.env up -d postgres redis

# 4. Migrations + seed
pnpm --filter @apps/api prisma:migrate
pnpm --filter @apps/api prisma:seed

# 5. Dev server (api + web em paralelo)
pnpm dev
```

API em `http://localhost:3333`, web em `http://localhost:5173`.

### Scripts úteis

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe api + web com hot reload |
| `pnpm build` | Build de tudo (turbo) |
| `pnpm test` | Roda unit tests em todos os pacotes |
| `pnpm test:e2e` | E2E (schema Postgres único por run) |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm typecheck` | TS strict em todos os pacotes |
| `pnpm format` | Prettier |
| `pnpm compose:logs` | Tail dos containers |
| `pnpm compose:down` | Derruba os containers |

---

## Deploy

### Setup em 1 comando (recomendado)

Para um deploy novo com domínio + HTTPS, use [`./setup.sh`](setup.sh) — bootstrap interativo:

```bash
./setup.sh        # ou: pnpm setup
./setup.sh --force # sobrescreve .env/Caddyfile existentes (faz .bak antes)
```

Ele pergunta o domínio base, os subdomínios (`app.`/`api.` + quantos extras quiser, ex: `minio.`, `grafana.`) e o e-mail do Let's Encrypt; e então:

1. Gera `apps/api/.env` e `apps/web/.env` já coerentes pra **subdomínios separados** (`AUTH_SECRET`/`WEBHOOK_SECRET` via `openssl rand`, CORS/origins/cookies corretos, `SECURE_COOKIES=true`).
2. Gera o `Caddyfile` (HTTPS automático via Let's Encrypt) com uma rota por subdomínio.
3. Gera `docker-compose.caddy.yml` (serviço `caddy` em 80/443).
4. Chama o `./deploy.sh`, que detecta o override e sobe o Caddy junto.

> Aponte os DNS (A/AAAA) de cada subdomínio pro IP do host **antes** de rodar — o Caddy só emite o certificado depois que o domínio resolve. `Caddyfile` e `docker-compose.caddy.yml` são gerados (gitignored): específicos do ambiente.

Para roteamento de serviços extras (minio, grafana), o `setup.sh` já cria a rota no Caddyfile; o serviço em si você adiciona normalmente ao compose.

#### VPS compartilhada (vários projetos)

O setup é à prova de colisão por padrão:

- **Namespacing** — `COMPOSE_PROJECT_NAME` (perguntado no setup) prefixa containers, volumes e redes. Dois clones do template na mesma VPS não se enxergam.
- **Sem portas internas no host** — com o Caddy na frente, `postgres`/`redis`/`api`/`web` **não publicam** porta no host (só existem na rede do projeto). Some a colisão de `5432`/`6379`/`3333`/`8080`. Caddy é o único que abre porta (80/443).
- **80/443 já em uso** — o `deploy.sh` detecta antes de subir o Caddy e aborta com instrução, em vez de falhar feio. Se já há um proxy na VPS, apague o `docker-compose.caddy.yml` e conecte `api`/`web` ao proxy existente via rede externa.

### Deploy direto (envs já preenchidos)

Único script: [`./deploy.sh`](deploy.sh). Faz tudo (build → infra healthy → migrations → api → web → caddy se existir).

### Pré-requisitos

1. `pnpm install` executado pelo menos uma vez (gera `pnpm-lock.yaml`).
2. `apps/api/.env` e `apps/web/.env` preenchidos. **Nenhuma env vive na raiz** — tudo nos apps.
3. Docker + Docker Compose v2 instalados.

### Rodando

```bash
./deploy.sh              # deploy completo
./deploy.sh --rebuild    # rebuild sem cache (use após mudar deps)

pnpm deploy              # atalho via package.json
pnpm deploy:rebuild
```

### O que o script faz

1. Valida que `apps/api/.env` e `apps/web/.env` existem
2. `docker compose build` (api Dockerfile + web Dockerfile multi-stage)
3. Sobe `postgres` + `redis` e espera ficarem `healthy`
4. Sobe `api` — o entrypoint roda `prisma migrate deploy` antes do servidor
5. Sobe `web` (nginx servindo build do Vite)
6. Mostra `docker compose ps`

API exposta em `${API_PORT:-3333}`, web em `${WEB_PORT:-8080}`.

---

## Comandos para a IA (slash commands)

Use no Claude Code dentro do projeto. Os comandos delegam pros agents corretos.

| Comando | O que faz |
|---|---|
| `/onboarding` | Apresenta o projeto a um dev novo. **Pergunta primeiro** se você quer overview, tópico específico ou dúvida direta. |
| `/execute-task` | Executa uma task fullstack/backend/frontend via `dev-conductor`. Cria `CURRENT_TASK.md`, pede aprovação humana antes de codar. |
| `/review` | Roda os 6 analisadores read-only **em paralelo** (security-auditor + code-reviewer + silent-failure-hunter + type-design-analyzer + pr-test-analyzer + clean-code-reviewer) no diff atual. APPROVE strict — qualquer WARNING bloqueia merge. |
| `/reflect` | Audita a sessão atual e propõe deltas mínimos em CLAUDE.md/docs/agents pra reduzir atritos da próxima vez. Não edita sem aprovação. |
| `/document-task [slug]` | Gera doc de UMA task específica em md/docx/pdf, nível leigo/moderado/técnico (segue `docs/workflows/documentation-standards.md`). Output em `docs/tasks/<slug>/<nivel>.<ext>`. |
| `/commit` | Invoca `commit-composer`: apresenta plano (máx 4 arquivos/commit, Conventional Commits estrito), pede confirmação humana e **executa** `git add`/`git commit` direto. Atribui autoria ao contribuidor humano (config local), sem trailer Claude. No fim pergunta se quer abrir PR. |
| `/create-pr` | Invoca `pr-opener`: `git push -u origin <branch>` + `gh pr create --base develop` com body estruturado (Objetivo / O que mudou / Decisões / Riscos / Checklist). Retorna URL. |

---

## Agents

16 agents em [`.claude/agents/`](.claude/agents/). Cada um é especialista numa camada.

### Orquestradores

| Agent | Quando usar |
|---|---|
| `dev-conductor` | Tasks fullstack (back + front) ou que mudam contrato/segurança |
| `backend-conductor` | Tasks apenas em `apps/api/` |
| `frontend-conductor` | Tasks apenas em `apps/web/` |

### Especialistas

| Agent | Domínio |
|---|---|
| `domain-architect` | Use-cases, ports, entidades, eventos (`core/` e `domain/`) |
| `prisma-architect` | Schema, migrations, repos Prisma, transações |
| `api-engineer` | Controllers, guards, decorators, pipes, webhooks |
| `frontend-engineer` | Componentes, hooks, forms, rotas, TanStack Query |
| `test-engineer` | Vitest unit + e2e, factories, in-memory repos |
| `uazapi-expert` | Integração WhatsApp via uazapi (HMAC, BullMQ, idempotência) |

### Qualidade

| Agent | Quando |
|---|---|
| `security-auditor` | Auth, RBAC, headers, cookies, webhooks, secrets — **antes** do code-reviewer |
| `code-reviewer` | Aderência a padrões do template (sufixos, layering, transações) |
| `clean-code-reviewer` | Naming, tamanho de função, dead code — **depois** do code-reviewer |
| `performance-engineer` | Cache, queries N+1, paginação, bundle, boot |

### Processo

| Agent | Função |
|---|---|
| `commit-composer` | Monta bloco de commits Conventional |
| `docs-keeper` | Atualiza `docs/` após task aprovada |
| `lessons-keeper` | Memória de erros — lê `docs/_internal/lessons.md` no início de toda task, escreve quando há correção não-trivial |
| `onboarding-guide` | Apresenta o projeto a dev novo |

---

## Estrutura do monorepo

```
apps/
├── api/                  # NestJS DDD
│   ├── src/
│   │   ├── core/         # framework-agnostic (Either, UseCaseError)
│   │   ├── domain/       # entidades, value objects, use-cases, ports
│   │   └── infra/        # Prisma, HTTP, auth, cache, queue, jobs
│   ├── prisma/
│   └── Dockerfile
└── web/                  # Vite + React
    ├── src/features/     # feature-first
    ├── nginx.conf
    └── Dockerfile

packages/                 # libs internas reutilizáveis
├── observability/        # Pino + redact paths
├── queue/                # BullMQ helpers
├── tailwind-config/      # tokens HSL compartilhados
├── types/                # tipos cross-app
└── utils/

.claude/                  # agents + skills + tasks (Claude Code)
.opencode/                # mirror para usuários de OpenCode (ver README dentro)
docs/                     # docs do projeto (mantido por docs-keeper)
└── _internal/lessons.md  # memória interna de erros (lessons-keeper)
```

---

## Onde encontrar o que

- **Regras globais e padrões obrigatórios** → [`CLAUDE.md`](CLAUDE.md)
- **Como usar agents em detalhe** → [`.claude/agents/`](.claude/agents/)
- **Memória interna de erros (agentes)** → [`docs/_internal/lessons.md`](docs/_internal/lessons.md)
- **Para usar com OpenCode** → [`.opencode/README.md`](.opencode/README.md)
- **Tasks atuais / paused** → [`.claude/tasks/`](.claude/tasks/)

---

## Convenções não-negociáveis

Resumo pra não pegar você desprevenido (detalhes no [`CLAUDE.md`](CLAUDE.md) §3-§5):

- Imports fluem **`infra → domain → core`**. Nunca o contrário.
- Use-cases retornam `Either<UseCaseError, Result>` — **sem throw**.
- `userId`/`ownerId` **nunca** vem do body — sempre `@CurrentUser()`.
- RBAC é **allow-list** de permissões (`@RequiresPermission()` + `PermissionGuard`).
- Webhooks: HMAC SHA-256 + timestamp + nonce (replay ±5 min).
- Envs validadas com Zod no boot — `process.exit(1)` se faltar.
- Cache TTL **sempre** parametrizado (nunca hardcode).
- Conventional Commits obrigatório (validador no Husky).
