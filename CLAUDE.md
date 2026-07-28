# CLAUDE.md — Regras globais do template

> Este arquivo é o briefing que o Claude Code lê antes de executar qualquer tarefa neste repo. Mantenha curto, atualize quando uma decisão arquitetural mudar.

---

## 1. O que é este projeto

Template **monorepo** pré-configurado para iniciar projetos novos com **NestJS + DDD + Vite + React** sem refazer infra. Clone, renomeie `@apps/*` para `@<projeto>/*`, e comece pelo domínio.

**O que está pronto:** estrutura, tooling, abstrações framework-agnostic (`core/`), módulos de infra wired (Prisma, Redis, BullMQ, better-auth, env validation, observability), 16 agentes Claude e sistema de tasks.

**O que NÃO está pronto (proposital):** zero features de negócio. Sem entidades de domínio, sem use-cases, sem rotas, sem schema Prisma com tabelas de produto. Cada projeto adiciona o seu.

---

## 2. Stack

- **Monorepo:** pnpm workspaces + Turbo
- **Backend:** NestJS 10+ (Node 22+, TS strict), Prisma + Postgres 16, Redis 7, BullMQ, better-auth, Zod, Pino
- **Frontend:** Vite + React 19 + TypeScript + Tailwind v3 + shadcn/ui + TanStack Query + Zustand + React Hook Form + React Router v6 (data router)
- **Test:** Vitest (unit + e2e separados, schema Postgres único por run)
- **Lint:** ESLint flat config (regras unsafe ON como warn) + Prettier
- **Hooks:** Husky — **pre-commit só bloqueia `.env`/secret (~1s)**; **pre-push roda o gate completo** (`lint`+`typecheck`+`test`+`build`) numa **única invocação do turbo, em paralelo** (~92s; serializado custava 226s — não volte a serializar); commit-msg (Conventional Commits estrito, **scope obrigatório em todo tipo**); post-merge (reinstall se deps mudaram). Commit é barato de propósito: dá pra commitar quebrado, não dá pra dar push (medido 2026-07-15: com lint+typecheck+test o commit custava ~82s, e a regra de commits granulares multiplicava isso por task).

---

## 3. Layering (regra dura)

```
infra → domain → core
```

- `core/` é puro TS, framework-agnostic. Copiável entre projetos.
- `domain/application/` define **ports** (abstract classes) e **use-cases**.
- `domain/enterprise/` tem entidades + value objects + eventos de domínio.
- `infra/` adapta os ports e expõe HTTP/queue/db.
- **Imports nunca fluem ao contrário.** O `code-reviewer` agent reprova PR que quebrar isso.

### Either + UseCaseError

- Use-cases retornam `Either<UseCaseError<...>, Result>` — **sem throw**.
- Controllers traduzem `Left` → `CustomHttpException`. Único lugar que dá `throw`.
- `catch` dentro de use-case retorna `left(new UnexpectedError(e))` — **nunca** re-throw cru atravessando a fronteira de domínio. `UnexpectedError` vive em `core/errors/` e mapeia pra 500 genérico (sem leak) no `CustomHttpException`.

### Service vs Use Case

| Tipo | Quem injeta | Quando usar |
|---|---|---|
| **Use Case** | Repos + providers (abstract) | 1 operação atômica de negócio |
| **Application Service** | **Apenas outros use-cases e domain services puros** (NÃO repos) | Orquestrar múltiplos use-cases |
| **Domain Service** | Nada (puro) | Lógica de domínio sem estado |
| **Infra Service** | Qualquer infra | Adapter técnico |

Se um orquestrador escreve em ≥2 agregados → **obrigatório** `prisma.$transaction` ou outbox.

### Eventos de domínio

Use `@nestjs/event-emitter` via `DomainEventPublisher` (port em `domain/`, impl `NestEventPublisher` em `infra/`). **Não use** o singleton estático global do DDD clássico.

Subscribers em `domain/application/subscribers/` e use-cases em `domain/application/use-cases/` podem usar `@Injectable`/`@OnEvent` do Nest — exceção consciente ao layering (como Zod no domínio), **só para DI**. Continua **proibido** no domínio: `Logger` do Nest (pra logar use `console` ou um port), `@prisma/*`, `ioredis`, `express` ou qualquer import de `infra/`.

---

## 4. Padrões obrigatórios

- **Cobertura de testes: 100%** (line, branch, function, statement). `vitest.config.mts > coverage.thresholds: 100` é dura. Pirâmide canônica: unit (use-cases, entidades, VOs, services, subscribers, mappers, pipes, guards) + integration (controllers via `Test.createTestingModule + supertest`) + e2e (repositórios Prisma + endpoint público + procedures multi-camada). Detalhes em `.claude/agents/test-engineer.md`. Excludes mínimos em `coverage.exclude`: `main.ts`, `*.module.ts`, `index.ts`, `shared/database/generated/**`. `pnpm test:cov` falha se < 100%.
- **Validação:** Zod sempre. Sem class-validator. `ZodValidationPipe` lança `CustomHttpException` formatado.
- **Auth:** nunca aceitar `userId`/`ownerId` no body — sempre via `@CurrentUser()`.
- **Rate-limit de auth:** better-auth roda FORA do pipeline Nest (`toNodeHandler`), então `ThrottlerGuard` **não alcança** `/api/auth/*`. Proteja no próprio provider (`rateLimit` com storage Redis) OU middleware de lockout antes do handler. Serviço de lockout registrado tem que ser de fato invocado. **O `rateLimit` do better-auth NÃO pode ser um teto global único pra todo `/api/auth/*`:** o front chama `get-session` a cada navegação/foco, então um `AUTH_RATE_LIMIT_MAX` baixo aplicado a tudo derruba a sessão com `429`. Regra **por-path** — `sign-in`/`sign-up` estritos, `get-session` generoso (`customRules` do better-auth). Em dev, afrouxe.
- **Chave de rate-limit por identidade, nunca só por IP:** atrás de proxy-chain (CDN→nginx→BFF→API) ou NAT/CGNAT, chavear o throttler por `req.ip` colapsa em **contador global da plataforma** (`429` em massa) — o IP visível é de infra, não do cliente. O throttler `default` chaveia por sessão (`sess:<sha256(cookie *session_token)>`) quando autenticado, IP só pra tráfego anônimo; um throttler `ip` (teto `THROTTLE_IP_LIMIT`) é backstop contra rotação de cookie forjado. Token nunca logado (só hash); chave nunca vazia (`ip:unknown`). Lockout de auth segue por email. Se precisar de IP atrás de proxy, derive de **um header confiável env-gated** (ex: `CF-Connecting-IP`, sobrescrito pelo CDN) — **nunca** hop-counting com `trust proxy: N` (frágil orange/DNS-only, spoofável). Detalhe em `docs/infra/auth.md`.
- **RBAC:** allow-list de permissões (catálogo `PERMISSIONS` const + `@RequiresPermission()` + `PermissionGuard`). Nunca deny-list de roles.
- **Audit:** distinção `authUserId` (filtros) vs `actorUserId` (audit log).
- **Cookies:** `httpOnly: true`, `secure: env.SECURE_COOKIES`, `sameSite: 'lax'`. Cookie de sessão é host-only por padrão (sem `Domain`). Quando API e front vivem em subdomínios do mesmo apex, setar `AUTH_COOKIE_DOMAIN=.example.com` (better-auth `crossSubDomainCookies`) — sem isso o cookie é recusado por Safari/iOS, Brave e Chrome bloqueando 3rd-party, e `get-session` vem `null` só pra alguns navegadores ("loga pra uns, pra outros não").
- **Cache:** port em `domain/application/cache/`, impl Redis em `infra/`. TTL **sempre** parametrizado (nunca hardcode).
- **BullMQ:** `jobId` determinístico para idempotência, montado **sempre** via `makeJobId(...)` (`infra/queue/make-job-id.ts`) — nunca concatenar à mão. O BullMQ usa `:` como separador interno das chaves Redis, então `jobId` custom com `:` derruba o boot com `Custom Id cannot contain :`. O crash é invisível em teste que mocka a fila e só aparece quando o scheduler enfileira o primeiro job. `removeOnComplete: { count: 100 }`, `removeOnFail: { count: 1000 }`. Backoff exponencial. DLQ em tabela Postgres pra jobs que estouraram retries. **Cada `Worker` usa conexão dedicada (`redis.duplicate()`), nunca a do cache/auth** — o Worker roda comandos bloqueantes (BRPOPLPUSH) que seguram a conexão e starvariam os outros consumidores. Fecha a conexão no `onModuleDestroy` (worker `close()` → `connection.quit()`).
- **Webhooks:** HMAC SHA-256 + timestamp + nonce (replay protection ±5 min Stripe-style).
- **Storage:** `DiskStorage` valida que o path resolvido fica sob `rootDir` (`resolve().startsWith(rootDir + sep)`) e rejeita `".."`/separadores em `key`/`folder`, mesmo sem rota cliente (port genérico = input hostil).
- **Headers/CSP:** Helmet CSP declara `script-src` e `connect-src` explícitos (não confiar no `useDefaults` como única defesa); `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `frame-src 'none'`, `worker-src 'self'`; nonce para qualquer inline. **`img-src` sem wildcard `https:`** (`'self' data:` + origin de storage explícito se houver) — `img-src https:` frouxo permite exfil via `<img src>`.
- **Carga de permissões / cache best-effort:** leitura de cache (permissions, sessão) é best-effort — um blip de Redis **degrada pro DB**, nunca derruba a sessão de todos (`try/catch` na leitura → segue pro DB; escrita idem). O DB é a fonte da verdade; se ele cair, aí sim propaga. Nunca liberar com `[]` num erro de cache (escalonamento silencioso).
- **Env:** validação Zod no boot + `process.exit(1)` em caso de erro. Schema inclui `DB_POOL_MAX` (default `10`) e `BULL_BOARD_ENABLED` (default `false`). CI roda **Trivy** (`scan-type: fs`, `scanners: vuln`) sobre o `pnpm-lock.yaml`, falhando em high/critical — **não** `pnpm audit`, cujo endpoint o npm aposentou (410; pnpm 9 e 10 idem). Supressão só em `.trivyignore.yaml` com justificativa e mantém deps de auth no minor mais recente.
- **Logs:** Pino com redact paths (use `@apps/observability`). Sem leak de stack/SQL no error handler global. **`REDACT_PATHS` é piso, não teto:** ele cobre credencial/segredo/cartão + PII comum BR (`cpf`, `cnpj`, `rg`, dado bancário) mas **não conhece o domínio do projeto**. Ao modelar entidade com campo sensível (`salario`, `holerite`, `cid`, `saldo`), adicione o path **na mesma task** — redact que só sabe de senha e cartão dá falsa cobertura num produto cheio de PII. Idem payload de job em **DLQ e stdout**: erro de job não pode despejar o registro inteiro no log.
- **Ownership check:** permissão de papel (RBAC) e verificação de dono do registro (`ownerId === currentUser.id`) são duas camadas independentes — ambas obrigatórias. Uma não substitui a outra.
- **Contrato de listagem (tabela completa — regra dura):** todo endpoint HTTP que devolve lista nasce **completo**: paginação + ordenação + filtros + busca. Não existe "a tabela primeiro, os filtros depois".
  - **Paginação SEMPRE:** `page`/`perPage` (ou cursor) aplicando `take`/`skip`. `perPage` tem **default (20) e TETO (`z.number().max(100)`)** — sem teto o cliente pede `perPage=1000000` e derruba a API. Query sem limite em tabela grande = OOM e timeout.
  - **Ordenação:** `sortBy` **sempre** via allow-list `z.enum([...] as const)` + `sortDir: 'asc'|'desc'`. **Nunca** repasse `sortBy` cru do query pro `orderBy` do Prisma — é injeção de campo e DoS (ordenar por coluna sem índice).
  - **Busca e filtros:** `search` (opcional) e filtros tipados via Zod. Só busque/filtre/ordene por coluna com `@@index` (regra de índices abaixo) — senão é seq scan garantido.
  - **Resposta:** `{ data, page, perPage, total, totalPages }` (ou `{ data, nextCursor }` no modo cursor). Sem `total`, o front não consegue montar a paginação.
- **Truncamento silencioso é proibido (regra dura):** `take: 5000` / `take: 50_000` **não é paginação — é um teto fixo que corta dado sem avisar**. Passa em qualquer review que só procure "tem `take`?", e o estrago é invisível: com `orderBy` ascendente o corte derruba os *últimos* registros, que viram "sem dado" e o cálculo a jusante trata como zero/ausente (num sistema de ponto, vira **falta e desconto indevido em folha**). Se um consumo interno precisa varrer tudo: **itere por cursor até o fim** ou **agregue no banco** (`groupBy`/`aggregate`). Se um teto é mesmo necessário, **falhe explicitamente** (`count > MAX` → erro) em vez de truncar. Um `take` só é legítimo quando é o `perPage` (com teto) de uma paginação real ou um lookup comprovadamente bounded (`take: 1`).
- **Signed URL:** presenters nunca expõem chave de storage crua. Sempre resolver via `StorageProvider.getSignedUrl()` antes de serializar.
- **Invalidação de cache por mutação:** use-cases que escrevem (create/update/delete) chamam `cache.invalidateByPattern(...)` na mesma operação. Cache stale pós-mutação é bug silencioso.
- **Pool de conexões explícito:** `max` do pool Postgres via `DB_POOL_MAX` (env com default seguro). Nunca usar o default implícito do driver com múltiplas instâncias.
- **Índices de banco:** ao criar coluna usada em `WHERE`, `ORDER BY` ou `JOIN`, adicionar `@@index` na mesma migration. Sem índice em FK é N+1 garantido.
- **BullMQ lockDuration:** o `lockDuration` do Worker deve ser maior que o timeout da operação mais lenta do job (ex: `lockDuration = 2 × OPENAI_TIMEOUT_MS`). Sem isso, jobs lentos são marcados como stalled e re-enfileirados concorrentemente.
- **Health check:** `GET /health` público, sem auth, retorna `{ ok: true }` 200. Verificar conexão Postgres e Redis. E2E obrigatório: `expect(response.status).toBe(200)`. Sem `/health`: K8s/Docker Swarm não detecta crash de app (DB conectado mas evento loop travado).
- **Graceful shutdown:** `SIGTERM`/`SIGINT` → `await app.close()` com timeout de 30 s. Ordem de fechamento: BullMQ workers → Prisma → Redis. Sem isso: requests em voo são cortadas abruptamente em deploy.
- **Request body size limit:** `app.use(express.json({ limit: '10mb' }))` + `express.urlencoded({ limit: '10mb' })` em `main.ts`. Sem limite: payload de 1 GB satura memória antes de chegar no controller.
- **Normalização de input sensível:** email sempre `.toLowerCase().trim()` antes de usar em chave Redis, comparação de dedup ou lockout. `User@Example.COM` ≠ `user@example.com` em lookup Redis = bypass silencioso de rate-limit.
- **Audit log atômico vs HTTP log:** `SecurityAuditInterceptor` captura metadados HTTP (latência, status, path) — logging de operação, não de negócio. Audit de negócio (quem fez o quê em qual registro) vai dentro do use-case via `auditRepo.create()` no mesmo `$transaction`. Os dois coexistem e não são intercambiáveis.

---

## 5. Naming / convenções

- Arquivos kebab-case: `create-user-use-case.ts`, `prisma-user-mapper.ts`.
- Artefatos Nest usam sufixo com **PONTO**: `x.controller.ts`, `x.guard.ts`, `x.pipe.ts`, `x.service.ts`, `x.interceptor.ts`, `x.module.ts`, `x.processor.ts`, `x.decorator.ts`. Artefatos de domínio puro usam **TRAÇO**: `create-x-use-case.ts`, `prisma-x-mapper.ts`.
- Classes PascalCase com sufixo do papel: `CreateUserUseCase`, `PrismaUserRepository`.
- Pastas por subdomínio (não flat): `infra/database/prisma/mappers/<sub>/`.
- Specs ao lado do arquivo (`*.spec.ts`).
- Factories de teste: `make-x.ts` (camelCase, **NÃO** `MakeX`).
- `sut` como nome canônico do alvo do teste.
- `describe(ClassName.name, ...)`.
- Path alias: `@/*` → `./src/*` em todos os tsconfigs.

---

## 6. Frontend (rules-of-thumb)

### Design system (identidade de fábrica)

O template já vem com uma identidade visual de **dashboard administrativo**: base **slate** fria + **primary azul** (`--primary: 217 91% 60%`), set semântico completo (`success`/`warning`/`info`/`destructive`), **dark mode** (`.dark`), **fonte Inter** (`@fontsource-variable/inter`), `--radius: 0.625rem`, sidebar navy. **Não comece do shadcn cru** — use os tokens e o kit abaixo.

- **Rebrand é 1 token:** trocar a cor de marca de um projeto = mudar `--primary` (e `--ring`/`--sidebar-primary` se quiser) nos DOIS arquivos de token: `apps/web/src/styles/globals.css` **e** `tooling/tailwind-config/globals.css` (mantidos em espelho). Cores semânticas via classes Tailwind (`bg-success`, `text-info`, etc.) — definidas no preset.
- **Kit pronto em `components/ui/`** (shadcn, `coverage.exclude` → não exigem spec): `card`, `table`, `skeleton`, `dropdown-menu`, `sonner` (Toaster), `pagination`, `avatar` (iniciais), `badge` (variants `success`/`warning`/`info`/`muted`), `empty-state`, `page-header`, `stat-card` (KPI), além de `button`/`input`/`label`/`select`/`dialog`/`alert-dialog`/`tooltip`. **Reutilize antes de criar.**
- **Shell pronto:** `AppShell` (sidebar desktop + header sticky com blur + container `max-w-screen-2xl`), `Sidebar` (brand + nav com ícones, `hidden md:flex`), `MobileNav` (drawer hamburger `<md`), `UserMenu` (avatar + dropdown + logout via `useSignOut`), `ThemeToggle` (cicla claro→escuro→sistema). Nav items em `SIDEBAR_ITEMS` (sidebar.tsx) — adicione rotas ali.
- **Todo item de navegação SEMPRE com ícone** (sidebar, mobile nav, tabs, menu, breadcrumb). Use `lucide-react`, ícone com `aria-hidden` (o label dá o nome acessível) e `shrink-0`. `SIDEBAR_ITEMS` exige o campo `icon: LucideIcon` — adicionar rota sem ícone é incompleto. Item de nav sem ícone não passa no review.
- **Todo campo de senha SEMPRE com toggle de olho** — nunca `<Input type="password">` cru. Use `<PasswordInput>` (`components/ui/password-input.tsx`), que repassa todos os props (`register`, `id`, `aria-describedby`) e já traz o botão mostrar/ocultar. Vale pra qualquer segredo (senha, token, chave). Campo de senha sem olho não passa no review.
- **Componentes com lógica fora de `components/ui/`** (shell, `shared/`, features) seguem o gate de **cobertura 100%** normal — spec obrigatório. `components/ui/**` é o único isento.

- **Feature-first** organization (`apps/web/src/features/<modulo>/`).
- **TanStack Query** pra server state. **Zustand** SÓ para client state UI (sidebar aberta, etc). Nunca duplicar server state em store.
- **React Hook Form + Zod resolver** pros forms.
- **React Router v6 data router + loaders** pra auth guards (equivalente do "server-side guard").
- **Vite com `manualChunks` explícito** (react/query/charts), nunca `undefined`. Rotas de página SEMPRE via `lazy: () => import(...)` no `createBrowserRouter` — import estático de página no bundle inicial = bug (bloqueia no gate).
- **Permission-aware sidebar** — itens são ocultos via `hasAnyPermission(user.permissions, item.requiresAny)`.
- Design tokens HSL no Tailwind (cluster `sidebar.*` dedicado já está em `@apps/tailwind-config`).
- ErrorBoundary global + Sonner pra toasts de erro de API.
- **Mobile-first obrigatório** — classes Tailwind sem prefixo aplicam mobile; `sm:`/`md:`/`lg:`/`xl:` apenas pra crescer. Touch target ≥44×44px em interativos. Sem largura fixa em px sem alternativa mobile. Teste em 375/768/1024/1440 antes de marcar feature como done. Detalhe em `frontend-engineer` seção "Responsividade".
- **Form submit UX:** `isPending` / `isLoading` da mutation → disable botão durante envio. Erro do servidor mapeado field-level se `details` vem no `ZodValidationPipe` response. Pós-submit sucesso: limpar form OU navegar, não ambos.
- **ErrorBoundary placement:** wrapper em layout `_private` (toda rota autenticada). Fallback mostra "Erro inesperado" + botão reload. Log em produção via serviço externo (Sentry/etc). Erros de permissão (403) não caem aqui — o data router loader redireciona antes.
- **Dialog/Modal:** `Dialog` da shadcn/ui (Radix). Form footer SEMPRE dentro de `<form>` tag — nunca `form="id"` attribute (quebra submit em Brave/Android, passa em jsdom).
- **Submit nunca envia inválido conhecido:** se a UI já sabe que um campo é inválido (ex: `SlugField` mostrando "indisponível", e-mail já em uso checado async), **desabilite o submit** — não deixe enviar pra colher `409`/`422` do servidor como "feedback". O servidor é o backstop, não o validador de primeira linha.
- **Botão desabilitado SEMPRE com motivo visível** (tooltip/texto). Botão `disabled` sem explicação parece bug. Se a explicação vive numa coluna/elemento que some no mobile (ex: badge "Sistema"), o motivo tem que aparecer de outra forma no mobile (tooltip no próprio botão).
- **Empty-state obrigatório** em toda lista/select/modal que pode vir vazio — texto que orienta a próxima ação ("Nenhum projeto ainda. Crie o primeiro."), nunca um vazio mudo.
- **Tabela completa (regra dura):** toda tabela/listagem nasce com **paginação + ordenação + busca + filtros** — nunca "a tabela primeiro, o resto depois". Casa com o contrato de listagem do backend (§4).
  - **Paginação server-driven** via `Pagination` (`components/ui/pagination`) ou cursor/`LoadMore`. **Proibido** buscar a lista inteira e paginar no cliente — o teto de `perPage` do backend existe justamente pra isso.
  - **Ordenação** clicável no header, refletindo `sortBy`/`sortDir` na query do servidor (nunca `.sort()` só no array da página atual — ordenaria só as 20 linhas visíveis, o que é um bug de dado, não de UI).
  - **Busca com debounce** (~300ms) — sem debounce é 1 request por tecla.
  - **Estado na URL** (`useSearchParams`): página, sort, busca e filtros. Refresh/voltar/compartilhar link têm que preservar a visão.
  - **Estados obrigatórios**: loading (`Skeleton`), `EmptyState` (distinguir "nada cadastrado" de "nada encontrado no filtro" — o segundo oferece limpar filtro), e erro com retry.
  - Responsivo continua valendo (§6 mobile-first): colunas secundárias somem no mobile, nunca a paginação.
- **Recurso "gera-uma-vez" expõe STATUS no GET** (sem o segredo): o GET de config de chave/credencial retorna se já foi gerada (`hasKey: true`, `lastRotatedAt`), e a UI alterna **Gerar ↔ Rotacionar**. Não confie em `409` na re-geração como sinal de "já existe" — isso é feedback tarde demais.
- **Data-only SEMPRE via `@/lib/date` — nunca `new Date(iso)` + `.toISOString()`.** Para coluna `@db.Date` (sem hora/fuso), use `parseLocalDate(iso)` na leitura e `toDateOnly(date)` no envio. O par `new Date(iso)`/`.toISOString()` interpreta/serializa em **UTC**: em BRT `2026-01-01T00:00:00.000Z` renderiza **31/12/2025**, e salvar sem tocar no campo grava o dia anterior — **o erro é cumulativo a cada abrir-e-salvar**. Atinge admissão (base de férias/rescisão) e nascimento (elegibilidade de IR/plano). O helper é **um só** (`apps/web/src/lib/date.ts`): **proibido reimplementar/copiar `parseLocalDate`/`toDateOnly` dentro de um form** — foi exatamente a cópia em 5 arquivos que fez o bug reincidir em jornada, metas, 9box e desligamento. Utilitário copiado vira bug reincidente: onde a cópia não chegou, o bug nasceu.
- **Data/hora SEMPRE com picker customizado — nunca o nativo.** Proibido `<input type="date">`, `type="time">`, `type="datetime-local">`. O nativo é inconsistente entre navegadores (aparência, locale, área clicável de ~24px no ícone) e não combina com o design system. Use um picker próprio: shadcn `Calendar` (sobre `react-day-picker`) dentro de `Popover` para data, e um seletor custom (Select de horas/minutos ou máscara) para hora. Quando o primeiro campo de data/hora surgir, o `frontend-engineer` cria o componente em `components/ui/` e todos passam a reusá-lo. Campo de data/hora nativo não passa no review.

---

## 7. Workflow

> **LEIA O §7.1 ANTES DESTA LISTA.** Os 12 passos abaixo são o caminho de uma task **normal/grande** — orquestram ~19 agentes e ~5 pausas humanas. Rodá-los num fix de 1 linha é desperdício, não cuidado: **classifique o tier primeiro** e escale a cerimônia ao tamanho da task. Tier trivial = editar direto, sem nada disto.

1. Toda tarefa **normal/grande** (§7.1) passa por **`dev-conductor`** (ou `backend-conductor`/`frontend-conductor`).
2. Conductor cria `.claude/tasks/CURRENT_TASK-<username>.md` (uma por dev, rastreada pelo git) com objetivo + decisões + riscos, **consulta `lessons-keeper`** pra puxar lições relevantes e **pede aprovação humana** antes de codar.
2.5. **Branch da task** — após aprovação, conductor corta `<type>/<slug>` a partir de `develop` (sempre `develop`, nunca `main`). `<type>` segue Conventional Commits (`feat`/`fix`/`refactor`/`chore`/`docs`/`test`/`perf`). Working tree precisa estar limpa.
3. (Opcional) **`code-explorer`** mapeia BC existente em ≤300 tokens antes dos implementadores entrarem.
4. Implementadores (`domain-architect`, `prisma-architect`, `api-engineer`, `frontend-engineer`, `test-engineer`) executam em paralelo quando possível.
5. **Esteira de revisão EM PARALELO, com dispatch por path** (uma única mensagem, múltiplas Agent calls): **sempre (4)** `code-reviewer` + `silent-failure-hunter` + `clean-code-reviewer` + `security-auditor` (segurança nunca pula — o vetor pode viver em `infra/database`/`infra/storage`/`infra/jobs` sem tocar controller); **por gatilho (2)** `type-design-analyzer` (toca `domain/`/`application/`/`enterprise/`/`core/`), `pr-test-analyzer` (diff tem qualquer `.ts`/`.tsx`/`vitest.config*`; pula só em docs-only). Espelha o dispatch do `pr-reviewer` Fase 3.5. **APPROVE strict** — qualquer WARNING de qualquer analisador disparado bloqueia merge. **Responsividade é dimensão BLOQUEANTE:** todo diff que toca `apps/web/**/*.tsx` é re-verificado pelo `code-reviewer` contra o checklist mobile-first (§6) — tela não-responsiva reprova igual a quebra de layering (input nativo de data/`<select>` = CRÍTICO). **Listagem/tabela é dimensão BLOQUEANTE** (back e front): o `code-reviewer` cobra o contrato completo (§4/§6) — paginação + ordenação + busca + filtros; `findMany` sem `take`/`skip`, `perPage` sem teto, `sortBy` cru no `orderBy` e paginação feita no cliente são CRÍTICOS. **Re-revisão incremental** com reavaliação de gatilho sobre o delta (detalhe em `dev-conductor` passo 4).
6. Se houve correção não-trivial → `lessons-keeper` (modo ESCRITA) registra em `docs/_internal/lessons.md`.
7. (Opcional) **`quality-fixer`** roda `lint + type-check + test + build` em loop, auto-corrige mecânico.
8. **PARA e pergunta**: "Task concluída? (sim / ajustar / cancelar)".
9. Após "sim" → `docs-keeper` atualiza `docs/` canônica (+ `technical-designer` se há decisão pra virar ADR) → marca `done`.
10. (Opcional) **`task-documenter`** — pergunta se quer gerar doc dessa task em md/docx/pdf, nível leigo/moderado/técnico (segue `docs/workflows/documentation-standards.md`). Output em `docs/tasks/<slug>/<nivel>.<ext>`. Não substitui `docs-keeper`.
11. **`commit-composer`** — apresenta plano (máx 4 arquivos/commit, Conventional Commits estrito), pede confirmação humana, **executa** `git add`/`git commit` atribuindo ao contribuidor humano (config local `user.name`/`user.email`). **Sem trailer Claude** (Co-Authored-By, Generated with, 🤖, link claude.com).
12. **`pr-opener`** (opcional, perguntado pelo `commit-composer`) — `git push -u origin <branch>` + `gh pr create --base develop --head <branch>` com title Conventional Commits + body estruturado (Objetivo / O que mudou / Decisões / Riscos / Checklist / Referências). Retorna URL do PR.

**Atalhos:**
- `/setup` — **primeiro comando a rodar em todo projeto novo**. Faz 5 perguntas (tipo, auth UI, email, upload, domínio) + 1 etapa **opcional** de integração ClickUp (descobre o List ID via MCP) e gera `docs/PROJECT.md`. Condutores bloqueiam a primeira task se este arquivo não estiver preenchido.
- `/create-task-clickup <descrição>` — **(opcional, requer ClickUp habilitado no `/setup`)** explora o código + cruza com CLAUDE.md/docs e cria uma task rica no ClickUp via MCP. List ID e prefixo vêm do `docs/PROJECT.md` (nunca hardcode). Pede confirmação antes de criar.
- `/execute-task-clickup <PREFIXO-N>` — **(opcional)** puxa a task do ClickUp via MCP, apresenta análise de requisitos e delega ao conductor (mesmo fluxo do `/execute-task` local: branch → especialistas → esteira → commit → PR com `Closes <PREFIXO-N>`). O workflow local de tasks continua o default; ClickUp é fonte alternativa.
- `/review` — 6 analisadores read-only em paralelo no diff (working tree).
- `/pr-review` — chama `pr-reviewer` direto numa PR/branch inteira: gate bloqueante (typecheck/lint/build/test/test:e2e/cobertura 100%) + scans determinísticos + os 6 analisadores em paralelo + comentário no GitHub. APPROVE strict.
- `/reflect` — audita a sessão e propõe deltas no template.
- `/document-task [slug]` — chama `task-documenter` direto numa task específica (sem precisar do conductor).
- `/commit` — chama `commit-composer` direto (executa após confirmação humana; pergunta PR no fim).
- `/create-pr` — chama `pr-opener` direto (publica branch + abre PR pra `develop`).
- `/continue-task` — lista todas as tasks ativas e pausadas do time (com %, autor, branch, data), permite escolher qual retomar.

**Memória de erros (`docs/_internal/lessons.md`):** arquivo interno mantido pelo `lessons-keeper`. Não aparece no onboarding. Cada lição = sintoma + causa + correção + onde aparece. Existe pra evitar repetir o mesmo erro entre tasks.

Lista completa de agentes em [`docs/agents/GUIA.md`](docs/agents/GUIA.md).

---

## 7.1 Escalar o processo ao tamanho da task (regra dura)

O pipeline completo (conductor → CURRENT_TASK → aprovação → branch → especialistas → esteira de 4-6 → lessons → quality-fixer → commit → PR) é o caminho de uma task **normal/grande**. Rodá-lo inteiro num fix de 1 linha é desperdício, não cuidado. **Antes de disparar a esteira, classifique a task em um tier.** Qualidade não cai porque o gate continua: o que muda é *quais* gates rodam, proporcional ao risco do diff.

| Tier | Critério (TODOS verdadeiros) | Caminho |
|---|---|---|
| **Trivial** | 1 arquivo; não toca contrato público (rota/DTO/schema), auth/RBAC, infra (`infra/`, env, migrations, jobs), nem `core/` | Editar direto. Rodar **só o gate relevante** (ex: typecheck se mexeu em tipo; o teste do arquivo se mexeu em lógica). Sem conductor, sem esteira, sem branch dedicada se já estamos numa. |
| **Pequena** | 1 BC; não muda contrato público nem superfície de segurança; ≤ ~4 arquivos | Implementar direto (ou conductor leve). Esteira **só com os reviewers cujo gatilho de path bateu** — não os 6. Gate: lint + typecheck + testes afetados. |
| **Normal/Grande** | Multi-arquivo, OU muda contrato, OU toca auth/RBAC/infra/`core/`, OU ≥2 agregados | Pipeline completo atual. Sem atalho. |

**Gatilho de segurança (corrige a leitura de "segurança nunca pula"):** `security-auditor` e `silent-failure-hunter` rodam **sempre que o diff toca a superfície de segurança** — auth, RBAC, cookies, headers, webhooks, secrets, log redact, input de borda, `infra/database`, `infra/storage`, `infra/jobs`. Um diff que só mexe em `apps/web/.../Button.tsx` ou numa string de cópia **não tem vetor pra auditar** — pular ali não é relaxar o gate, é não inventar trabalho. Na dúvida sobre o tier, **suba um nível**.

**Acelerações válidas em qualquer tier (não custam qualidade):**
- Não re-ler arquivo recém-editado pra "conferir" — o harness rastreia o estado; `Edit`/`Write` falham se a mudança não aplicou.
- Rodar `lint` + `typecheck` + `test` **em paralelo**, não em loop sequencial.
- Lançar especialistas/reviewers independentes numa **única leva paralela** (uma mensagem, múltiplas `Agent` calls).
- Não re-derivar fato já estabelecido na conversa nem narrar opções que não vou seguir.

---

## 8. Onde encontrar o que
- **Configuração do projeto:** `docs/PROJECT.md` — tipo (SaaS/interno/API), funcionalidades habilitadas (auth UI, email, upload), guia para condutores. Gerado pelo `/setup`. Condutores leem antes de toda task.
- **Decisões arquiteturais:** `docs/architecture/` (ADRs em `decisions/`)
- **Convenções:** `docs/workflows/` (incluindo `documentation-standards.md`)
- **Agentes:** `.claude/agents/<nome>.md` + página em `docs/agents/<nome>.md`
- **Tasks:** `.claude/tasks/CURRENT_TASK.md` + doc por task em `docs/tasks/<slug>/`
- **Branches:** `main` = release/prod; `develop` = base de todas as tasks; `<type>/<slug>` = branch da task

---

## 9. NÃO FAZER

- ❌ Adicionar feature de exemplo no template (use-cases, rotas, entities de negócio). Este repo é só infra.
- ❌ Importar de `infra/` em `domain/` ou `core/`.
- ❌ Throw em use-case (use Either).
- ❌ `userId`/`ownerId` no body de request.
- ❌ Mockar Prisma em teste de repositório (use schema E2E real).
- ❌ Mockar dependência quando dá pra usar in-memory repository.
- ❌ Deixar arquivo de produção sem spec correspondente (a menos que esteja em `coverage.exclude`).
- ❌ Baixar `coverage.thresholds` pra "passar" — fix é cobrir o código, não relaxar o gate.
- ❌ Pular integration spec de controller, e2e de endpoint público, ou e2e de repositório Prisma — pirâmide obrigatória.
- ❌ Hardcode de TTL de cache.
- ❌ Pular hooks com `--no-verify` ou `--no-gpg-sign` sem permissão explícita do humano.
- ❌ Commitar `.env` ou qualquer arquivo de secret (o pre-commit bloqueia).
- ❌ Montar Bull Board / Prisma Studio / Swagger / métricas sem guard admin ou sem env-gate (default `false` em prod). Proibido merge com TODO "proteger depois" em auth/dashboard.
- ❌ **Dead security code** — serviço de segurança implementado mas não injetado/invocado (ex: lockout criado mas sem chamar `isBlocked`). Deve ser detectado no code-review antes do merge.
- ❌ **IDOR** — use-case de leitura/mutação com campo `ownerId`/`visibility` sem checar que `currentUser.id === ownerId`. Permissão de papel não substitui isolamento de registro.
- ❌ `findMany` sem `take`/`skip` (ou cursor) exposto em endpoint HTTP.
- ❌ **`perPage` sem teto** (`z.coerce.number()` solto) — cliente pede `perPage=1000000` e derruba a API. Sempre `.max(100)` (ou o teto do projeto).
- ❌ **`take: <literal grande>` como "paginação"** (`take: 2000`, `take: 50_000`) — é truncamento silencioso, corta os últimos registros sem erro nem log e vira dado errado a jusante. Cursor até o fim, agregação no banco, ou falha explícita se `count > MAX`.
- ❌ **`sortBy` cru do query no `orderBy` do Prisma** — injeção de campo + DoS (ordena por coluna sem índice). Sempre allow-list `z.enum([...] as const)`.
- ❌ **Tabela sem paginação/ordenação/busca/filtros** — front ou back. Listagem incompleta é dívida que nunca é paga (§4 e §6).
- ❌ **Paginar/ordenar/filtrar no cliente** sobre a página já carregada — ordena só as linhas visíveis, mente pro usuário. Tudo server-driven.
- ❌ Use-case mutador (create/update/delete) sem `cache.invalidateByPattern(...)` quando há cache do recurso.
- ❌ Chave de storage crua em response de presenter (usar sempre signed URL).
- ❌ Import cross-controller (controller A importando tipo/schema de controller B) — extraia para arquivo compartilhado ou duplique.
- ❌ Campo em entidade sem coluna correspondente no `schema.prisma` (ou vice-versa) — mapper deve cobrir os dois lados.
- ❌ Port abstract method sem ao menos um use-case consumidor — port sem consumidor é letra morta.
- ❌ `Error` nativo no `Left` do Either — use subclasse de `UseCaseError` sempre. `new Error(...)` como valor do Either bypasssa o mapeamento HTTP.
- ❌ Alterar `coverage.thresholds` ou excluir arquivo de `coverage.exclude` dentro de branch de feature para "passar o gate" — corrija a cobertura, não relaxe o gate.
- ❌ Guard que retorna `[]` quando `permissions` é `undefined` — se o plugin de auth não populou, negar acesso (retornar `false`), não liberar com permissões vazias.
- ❌ `publishAll()` sem `await` em handlers async — usar `emitAsync()` do EventEmitter2 e tornar `publishAll()` async.
- ❌ `UnexpectedError` sem logar o erro original — sempre `console.error('[UseCase]', err)` antes do `return left(new UnexpectedError(err))`. Stack trace perdido = debugging de produção cego.
- ❌ Catch silencioso em middleware de segurança — se middleware falha ao parsear body, logar o erro antes de chamar `next()`. Silencioso = invisível em produção.
- ❌ `CORS_ALLOWED_ORIGINS` vazio em produção — resulta em `Access-Control-Allow-Origin: *`. Sempre listar origins explícitos no env de prod.
- ❌ Detecção de email duplicado via regex em message string — frágil se lib mudar o texto. Verificar código da exceção (`P2002` no Prisma) ou usar tipagem de erro da lib.
- ❌ `jobId` custom com `:` (ou concatenado à mão) — o `:` é reservado do BullMQ e derruba o boot (`Custom Id cannot contain :`); passa despercebido em teste que mocka a fila. Sempre `makeJobId(...)` (`infra/queue/make-job-id.ts`), que junta segmentos com `_` e rejeita `:`.
- ❌ **SSRF por DNS-rebinding (TOCTOU)** — fetch de saída pra URL/host controlado pelo usuário que valida o IP num `dns.lookup` e deixa o `fetch` re-resolver o hostname por conta própria. O DNS do atacante responde IP público no guard e `169.254.169.254` no fetch → exfiltra o metadata endpoint. Resolver UMA vez, validar (rejeitar privado/link-local/loopback) e conectar no IP fixado (custom `lookup`/agent), não no hostname.
- ❌ **Catch-all em processor que marca o job como erro TERMINAL** — `catch { await falhar(...); return right() }` não distingue transitório (timeout/429/5xx de API externa) de terminal (payload inválido). O job conclui "com sucesso", sem retry e sem DLQ, e um blip de rede queima o registro; o `attempts: 5` com backoff vira **letra morta**. Transitório → **rethrow** (BullMQ retenta); terminal → `falhar()`. Na dúvida, rethrow.
- ❌ **`createMany({ skipDuplicates: true })` como "idempotência"** — ele **descarta em silêncio**: o `count` volta menor e ninguém percebe. Só é aceitável se a chave `@@unique` for de fato a identidade lógica completa do registro. Se a chave for parcial, o `skipDuplicates` transforma **dado legítimo em dado perdido** — e em domínio regulado (ponto, fiscal) isso é passivo, não bug de UX. Se o descarte importa, compare `count` com o esperado e **reporte a diferença**.
- ❌ **Chave de idempotência que ignora a ORIGEM do dado** — id vindo de equipamento/parceiro externo (`values.id`) é PK **local daquele emissor**: duas catracas emitem `1,2,3…` e colidem entre si. A chave tem que incluir a origem (`@@unique([companyId, deviceId, deviceEventId])`), não só `[companyId, eventId]`. Guardar o dispositivo só como nome descritivo, fora da chave, é o bug.
- ❌ **Job idempotente que gera id novo por tentativa** — `recordSuccess`/efeito de job sem `@@unique` na chave lógica (ex: `projeto+bucket+dia`) + `upsert`. Retry/stalled/requeue de DLQ roda o efeito 2× → duplicata (2 objetos de storage, 2 registros). Idempotência = chave única no banco, não `jobId` só.
- ❌ **Desativar/deletar usuário sem revogar sessões ativas** — o `AuthGuard` só faz `getSession`; um user desativado no meio da sessão mantém acesso até a sessão expirar (dias). Deactivate/delete revoga as sessões (better-auth: apagar as rows de `session`) OU o `customSession` nega quando `isActive === false`. Middleware que só cobre `sign-in` não protege sessão já emitida.
- ❌ **Segredo gerado retornado de novo depois da criação** — `generate`/`rotate` de signing secret/chave simétrica devolve o segredo UMA vez (semântica "shown once"); o GET nunca retorna o segredo, só status (`hasKey`, `lastRotatedAt`). Ver regra §6 (recurso "gera-uma-vez").
- ❌ **Postgres/Redis publicado em `0.0.0.0`** — Docker faz bypass do UFW/iptables do host; `"5432:5432"` expõe o banco à internet numa VPS. Bind na loopback (`127.0.0.1:...`, via `POSTGRES_BIND_HOST`/`REDIS_BIND_HOST`). As cores blue/green alcançam o banco pela rede `apps-net`, não pela porta publicada.
- ❌ **Redis `maxmemory-policy allkeys-lru` com BullMQ** — despeja chaves de job sob pressão de memória → jobs somem/corrompem. Sempre `noeviction` (BullMQ exige); cache convive porque toda entrada tem TTL. Memória alta → split de Redis cache×fila.
- ❌ **`migrate deploy` no boot de cada container em deploy blue/green** — banco compartilhado entre cores: a cor nova migra o schema enquanto a cor antiga ainda serve → migration não-backward-compatible quebra a cor ativa. Migrations rodam UMA vez como one-off (`run --rm api ... migrate deploy`) antes de subir a cor nova; expand/contract obrigatório. Container blue/green sobe com `command: ["node", ...]`, sem migrar.
- ❌ **`IMAGE_TAG: latest` em compose de deploy** — tag mutável não é rollback-safe (não dá pra voltar pra "a de ontem"). Pinar SHA/versão; blue/green usam `${IMAGE_TAG:?...}` (falha se não setado).
- ❌ **Lockout que conta qualquer resposta não-2xx como falha** — 400 (body malformado)/429/5xx incrementando o contador vira DoS de conta (atacante trava a vítima só sabendo o email) e o 429 realimenta o próprio contador. Só `401` (credencial inválida) conta.
- ❌ **`trust proxy` hardcoded** — o nº de hops tem que bater com a cadeia real (CDN→nginx→app = 2, não 1). Env-gatear (`TRUST_PROXY`) e chavear rate-limit por sessão, nunca por `req.ip` (spoofável via XFF). Ver §4.

---

## 10. NÃO over-engineer (regra dura — referência: confeitaria-erp, conversai-api)

O código deve ser **bom e consistente**, NÃO complexo. Antes de criar uma abstração, pergunte: "isso existe em confeitaria-erp ou conversai-api?". Se NÃO existe lá, provavelmente não precisa aqui.

- ❌ **Sem `class Clock` / `TimeProvider`** — `new Date()` direto em entidades e use-cases.
- ❌ **Sem `TransactionRunner` / `UnitOfWork`** — `prisma.$transaction` direto.
- ❌ **Sem `IdGenerator`** — `randomUUID()` direto.
- ❌ **Sem `useGlobalPipes(ValidationPipe)`** — Zod per-endpoint via `ZodValidationPipe`.
- ❌ **Sem wrapper "só pra ser injetável"** em volta de função primitiva do Node.
- ❌ **Sem port abstract sem cliente real** ou sem ≥1 impl em `infra/`.
- ❌ **Sem comentário narrativo** no topo de arquivo / acima de port / explicando "o que o código faz". Naming + estrutura já dizem. Comentário existe SÓ pra: workaround técnico não-óbvio, TODO acionável com dono, regra de negócio com ref externa.
- ❌ **Sem comentário que revele mecanismo de segurança** — nunca descreva em comentário como o lockout funciona, como tokens são validados, qual algoritmo de hash/signing é usado, ou qualquer detalhe que ajude um atacante a entender a defesa. Comentário de código é pra manutenção técnica do dev, não pra documentar o modelo de segurança.
- ❌ **Sem `baseUrl`** em `tsconfig*.json` (deprecated em TS 6+). `paths` resolvem sozinhas.
- ❌ **Sem `as unknown as X`** quando o cast simples basta.
- ❌ **Sem `z.enum([...])` sobre array NÃO `as const`** — `z.infer` vira `string` em vez da união literal. Sempre `export const X = [...] as const` antes de `z.enum(X)`.
- ❌ **Sem `: JSX.Element` em `.tsx`** — React 19 removeu o namespace global. Use `ReactElement`, omita anotação, ou `import type { JSX } from 'react'`.
- ❌ **Sem `@OnEvent` sem `{ async: true, promisify: true }`** quando o listener é async — emitter engole rejeição.
- ❌ **Sem `app.setGlobalPrefix('api')`** ausente em `main.ts` se o Vite proxy do front forwarda `/api/*` — fallback `index.html` vira 200 OK silencioso.
- ❌ **Sem `*` anônimo em rota no Express 5** — o `path-to-regexp` v8 removeu o wildcard sem nome; `/api/auth/*` dá `Missing parameter name` e **derruba o boot inteiro**. Sempre nomeie: `/api/auth/*splat` (vale pra qualquer rota com `*`).
- ❌ **Sem `new PrismaClient()` cru em script fora do Nest (Prisma 7)** — o Prisma 7 exige driver adapter; `new PrismaClient()` sem adapter quebra com `needs valid PrismaClientOptions`. O app não sofre (usa `PrismaService` com adapter), só os scripts `tsx` (seed, backfill). Todo script standalone monta o client com `new PrismaClient({ adapter: new PrismaPg(pool) })`, igual ao `PrismaService`.
- ❌ **Sem confundir endpoint S3 com URL pública no storage (R2/S3)** — `STORAGE_ENDPOINT` é o endpoint da **API S3** (`<accountid>.r2.cloudflarestorage.com`), NÃO a URL pública de leitura (`pub-*.r2.dev`). Colar a URL pública no endpoint dá `401` no upload. São campos distintos: API de escrita vs URL de leitura.
- ❌ **Sem redeclarar catálogo de filas** (`QUEUE_NAMES`, `QueueName`, `DEFAULT_JOB_OPTIONS`) em `apps/api` — vive SÓ em `@apps/queue`.
- ❌ **Sem glob `.env*` em `turbo.json > globalDependencies`** — lista só envs commitados (`.env.example`); o glob inclui `.env.local` (gitignored) e busta o cache.
- ❌ **Sem `new Date(iso)` / `.toISOString()` em campo data-only** — use `parseLocalDate`/`toDateOnly` de `@/lib/date`. E **não copie o helper pra dentro do form**: cópia de utilitário é o mecanismo pelo qual o off-by-one de data reincide.
- ❌ **Sem `<select>` HTML nativo** quando shadcn/ui já tem `Select` — use o componente do design system para manter consistência visual e acessibilidade.
- ❌ **Sem componente construído mas não montado em página** — se o componente não aparece em nenhuma rota, não mergeia; feature incompleta é dívida técnica invisível.

Quando hesitar entre "criar abstração agora" vs "deixar concreto e abstrair depois se aparecer 2º caso", **sempre escolha concreto**. Três linhas repetidas é melhor que abstração prematura.
