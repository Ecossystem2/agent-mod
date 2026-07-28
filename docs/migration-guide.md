# Guia de Migração — Sistema de Agentes e Comandos (2026-06)

> Use este documento para atualizar projetos baseados em versões antigas deste template. Cobre o inventário completo de agentes, padrões vigentes, otimizações aplicadas e o checklist passo a passo de migração.

---

## Novos agentes e comandos por versão

Use isto para saber **o que criar do zero** no projeto antigo (vs o que só atualizar).

### v1.0 — 2026-05-12 (base)

Agentes que projetos muito antigos já devem ter (todos em `.claude/agents/` na época):

`api-engineer` · `clean-code-reviewer` · `code-reviewer` · `commit-composer` · `docs-keeper` · `domain-architect` · `frontend-engineer` · `performance-engineer` · `prisma-architect` · `security-auditor` · `test-engineer` · `uazapi-expert` · `backend-conductor` · `dev-conductor` · `frontend-conductor` · `lessons-keeper` · `onboarding-guide`

Comandos: `/commit` · `/onboarding` · `/new-feature` _(renomeado para `/execute-task` na v1.1)_

### v1.1 — 2026-05-30 ← maior expansão

**Agentes novos** (criar se não existir):

| Agente | Localização atual | Propósito resumido |
|---|---|---|
| `code-explorer` | `.claude/commands/agents/` | Mapeia fluxo de BC existente em ≤300 tokens antes dos implementadores |
| `silent-failure-hunter` | `.claude/agents/` | Detecta catch vazio, Either descartado, Promise sem await, fire-and-forget |
| `type-design-analyzer` | `.claude/agents/` | Encapsulamento AggregateRoot, ports vazando Prisma, invariantes em VO |
| `pr-test-analyzer` | `.claude/agents/` | Use-case sem spec, it.only/skip, mock no lugar de in-memory, threshold relaxado |
| `quality-fixer` | `.claude/commands/agents/` | Gate lint+typecheck+test+build em loop, auto-corrige mecânico, model haiku |
| `technical-designer` | `.claude/commands/agents/` | Redige ADRs em `docs/architecture/decisions/` |
| `pr-opener` | `.claude/commands/agents/` | `git push` + `gh pr create --base develop`. Model haiku |
| `task-documenter` | `.claude/commands/agents/` | Gera doc da task em md/docx/pdf, nível leigo/moderado/técnico |

**Comandos novos** (criar se não existir):

| Comando | Arquivo |
|---|---|
| `/execute-task` | `.claude/commands/execute-task.md` — substitui `/new-feature` |
| `/create-pr` | `.claude/commands/create-pr.md` |
| `/document-task` | `.claude/commands/document-task.md` |
| `/reflect` | `.claude/commands/reflect.md` |

### v1.2 — 2026-06-03

| O que é novo | Arquivo |
|---|---|
| Agente `pr-reviewer` (opus) | `.claude/commands/agents/pr-reviewer.md` — revisão completa de PR com gate bloqueante |
| Comando `/pr-review` | `.claude/commands/pr-review.md` |

### v1.3 — 2026-06-16

| O que é novo | Arquivo |
|---|---|
| Agente `ux-polisher` (sonnet) | `.claude/commands/agents/ux-polisher.md` — polish/UX do front DEPOIS da feature funcionar |

### v2.0 — 2026-06-18 (esta versão)

| O que é novo | Arquivo |
|---|---|
| Comando `/continue-task` | `.claude/commands/continue-task.md` — lista tasks ativas/pausadas do time |
| Sistema CURRENT_TASK-\<username\>.md | Convenção nova nos condutores + .gitignore |
| Otimizações de tokens | 6 agentes revisores com veredicto/escopo comprimido |

### v2.1 — 2026-06-19

Integração **opcional** com ClickUp para gerência de tasks (via MCP `claude_ai_ClickUp`, conectado a nível de conta no claude.ai — não há `.mcp.json` no repo).

| O que é novo | Arquivo |
|---|---|
| Etapa opcional ClickUp no `/setup` | `.claude/commands/setup.md` — descobre List ID via `clickup_get_workspace_hierarchy` e grava no `docs/PROJECT.md` |
| Seção "Integração ClickUp" no PROJECT.md | template em `setup.md` (List ID + nome da list + prefixo) |
| Comando `/create-task-clickup` | `.claude/commands/create-task-clickup.md` — cria task rica no ClickUp; lê List ID/prefixo do PROJECT.md (nunca hardcode) |
| Comando `/execute-task-clickup` | `.claude/commands/execute-task-clickup.md` — puxa task do ClickUp e delega ao conductor (ponte ClickUp → workflow existente) |
| Nota "Origem ClickUp" nos 3 conductors | `dev/backend/frontend-conductor.md` — registra `Closes <PREFIXO-N>` em **Referências** do CURRENT_TASK |
| Linha ClickUp no body do PR | `pr-opener.md` — surfacea `Closes <PREFIXO-N>` + URL quando presente |

**Coexistência:** o workflow local de tasks (`.claude/tasks/` + `/execute-task`) continua o **default**. ClickUp é fonte alternativa, habilitada por projeto no `/setup`. Quando `Habilitado = Não` no PROJECT.md, as duas skills ClickUp não devem ser usadas.

**O que fazer em projetos antigos:** copiar `create-task-clickup.md` + `execute-task-clickup.md` para `.claude/commands/`, aplicar a etapa 2.5 + bloco PROJECT.md no `setup.md`, e as notas "Origem ClickUp" nos conductors + `pr-opener`. Rodar `/setup` de novo (reconfigurar) para preencher a seção ClickUp.

### Reestruturação de diretórios (ocorreu entre v1.0 e v1.1)

**Antes:** todos os 17+ agentes ficavam em `.claude/agents/`.

**Agora:** dois diretórios com responsabilidades distintas:

```
.claude/agents/          ← apenas os 7 agentes revisores (lidos pelo Claude como tools globais)
.claude/commands/agents/ ← todos os 27 agentes como skills invocáveis pelo usuário/conductores
```

Os 7 revisores existem nos **dois lugares** — em `.claude/agents/` como ferramentas do pipeline e em `.claude/commands/agents/` como skills diretas.

**O que fazer em projetos antigos:** verificar se existe `.claude/commands/` com subpasta `agents/`. Se não existir, criar a estrutura e mover/copiar os agentes para os lugares certos (checklist na seção "Checklist de migração").

---

## O que mudou nesta versão

### 1. Otimizações de tokens nos agentes revisores

Seis agentes revisores tiveram seus blocos boilerplate comprimidos, reduzindo tokens por invocação sem perda de qualidade:

| Agente | O que foi comprimido |
|---|---|
| `code-reviewer` | Bloco "Regra de escopo" (9 linhas → 1 linha) + bloco "Veredicto" (7 linhas → 1 linha) |
| `security-auditor` | Bloco "Veredicto" (6 linhas → 1 linha) |
| `silent-failure-hunter` | Bloco "Veredicto" (4 linhas → 1 linha) |
| `type-design-analyzer` | Bloco "Veredicto" (5 linhas → 1 linha) |
| `pr-test-analyzer` | Bloco "Veredicto" (5 linhas → 1 linha) + removed `Read test-engineer.md` do setup inicial |
| `clean-code-reviewer` | Bloco "Veredicto" (5 linhas → 1 linha) |

**O que fazer:** copiar os 6 arquivos de `.claude/agents/` deste template por cima dos do projeto antigo.

### 2. Novo sistema de tasks por usuário (git-tracked)

- **Antes:** `.claude/tasks/CURRENT_TASK.md` — único arquivo, gitignored, não sincronizável entre devs.
- **Agora:** `.claude/tasks/CURRENT_TASK-<username>.md` — um por dev, rastreado pelo git.

O `<username>` é resolvido em runtime pelos condutores:
```bash
USERNAME=$(gh api user --jq .login 2>/dev/null || git config user.name | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
```

Benefício: um colega pode clonar/puxar e continuar a task de onde parou, com contexto completo.

### 3. Novo comando: `/continue-task`

Lista todas as tasks ativas e pausadas do time com metadados (título, resumo, %, autor, última atualização), e permite escolher qual retomar.

### 4. CLAUDE.md atualizado

- Referência ao arquivo de task atualizada para `CURRENT_TASK-<username>.md (uma por dev, rastreada pelo git)`.
- `/continue-task` adicionado ao bloco de Atalhos.

---

## Estrutura de arquivos de agentes

```
.claude/
├── agents/                          # Agentes revisores (sempre-on na esteira)
│   ├── code-reviewer.md
│   ├── security-auditor.md
│   ├── silent-failure-hunter.md
│   ├── type-design-analyzer.md
│   ├── pr-test-analyzer.md
│   ├── clean-code-reviewer.md
│   └── performance-engineer.md
│
└── commands/
    ├── execute-task.md              # /execute-task
    ├── review.md                    # /review
    ├── pr-review.md                 # /pr-review
    ├── reflect.md                   # /reflect
    ├── document-task.md             # /document-task
    ├── onboarding.md                # /onboarding
    ├── commit.md                    # /commit
    ├── create-pr.md                 # /create-pr
    ├── continue-task.md             # /continue-task  ← NOVO
    └── agents/                      # Agentes invocáveis pelos condutores
        ├── dev-conductor.md
        ├── backend-conductor.md
        ├── frontend-conductor.md
        ├── domain-architect.md
        ├── prisma-architect.md
        ├── api-engineer.md
        ├── frontend-engineer.md
        ├── ux-polisher.md
        ├── test-engineer.md
        ├── code-explorer.md
        ├── quality-fixer.md
        ├── lessons-keeper.md
        ├── docs-keeper.md
        ├── task-documenter.md
        ├── technical-designer.md
        ├── onboarding-guide.md
        ├── commit-composer.md
        ├── pr-opener.md
        ├── pr-reviewer.md
        └── uazapi-expert.md
```

---

## Inventário completo dos agentes

### Agentes de revisão — `.claude/agents/`

Estes 7 agentes são os **analisadores da esteira de code review**. São invocados via Agent tool pelos condutores e pelo `/review`. Nunca editam código — só leem e emitem veredicto.

| Agente | Modelo | Foco |
|---|---|---|
| `code-reviewer` | sonnet | Padrões do template: layering (infra→domain→core), Either sem throw, sufixos de arquivo, transações, allow-list de permissões, cache invalidation, signed URL |
| `security-auditor` | **opus** | OWASP completo: auth/RBAC, SQL injection (`$queryRawUnsafe`), path traversal (storage/upload), SSRF, mass-assignment, headers/cookies/CORS, webhooks HMAC, secrets, log redact, IDOR |
| `silent-failure-hunter` | **opus** | catch vazio, `??` mascarando erro, Either descartado sem tratar, Promise sem await, fire-and-forget sem `.catch`, `publishAll()` sem await |
| `type-design-analyzer` | sonnet | Encapsulamento AggregateRoot, ports vazando tipos Prisma, invariantes em Value Objects, pureza do domain layer |
| `pr-test-analyzer` | sonnet | Use-case sem spec correspondente, `it.only`/`it.skip`, mock Vitest substituindo in-memory repo, asserts fracos, threshold de coverage relaxado |
| `clean-code-reviewer` | sonnet | Naming, tamanho de função/arquivo, comentários desnecessários, dead code, import circular |
| `performance-engineer` | sonnet | Cache sem TTL, N+1 queries, `findMany` sem paginação, bundle size, lazy loading ausente, BullMQ lockDuration insuficiente |

### Agentes de orquestração e implementação — `.claude/commands/agents/`

#### Condutores (orquestram a task completa)

| Agente | Modelo | Quando usar |
|---|---|---|
| `dev-conductor` | sonnet | Task fullstack: toca `apps/api/` + `apps/web/`, ou muda contrato HTTP |
| `backend-conductor` | sonnet | Task somente backend (`apps/api/`, schema, jobs, webhooks) |
| `frontend-conductor` | sonnet | Task somente frontend (`apps/web/`, rotas, componentes, state) |

#### Implementadores (escrevem código)

| Agente | Modelo | Escopo |
|---|---|---|
| `domain-architect` | sonnet | `src/core/`, `src/domain/application/` (ports, use-cases, services, subscribers), `src/domain/enterprise/` (entidades, VOs, eventos) |
| `prisma-architect` | sonnet | `prisma/schema.prisma`, migrations, mappers, repositórios Prisma, `$transaction` |
| `api-engineer` | sonnet | Controllers, guards, decorators, pipes, interceptors, webhooks HMAC, presenters, módulos Nest |
| `frontend-engineer` | sonnet | Componentes React, hooks, forms (RHF + Zod), TanStack Query, Zustand, rotas com loaders, ErrorBoundary |
| `ux-polisher` | sonnet | Polish/UX DEPOIS da feature funcionar — hierarquia visual, microinterações, estados de UI. Só `apps/web/`, nunca muda contrato |
| `test-engineer` | sonnet | Unit specs, integration (controller via supertest), E2E (repos Prisma + endpoints), factories in-memory |

#### Read-only / análise

| Agente | Modelo | Propósito |
|---|---|---|
| `code-explorer` | sonnet | Mapeia fluxo de BC existente em ≤300 tokens — chamar ANTES dos implementadores em task sobre código existente |

#### Utilitários

| Agente | Modelo | Propósito |
|---|---|---|
| `quality-fixer` | **haiku** | Roda lint + typecheck + test + build em loop. Auto-corrige mecânico. Para em ambiguidade |
| `lessons-keeper` | sonnet | Modo LEITURA no início de toda task. Modo ESCRITA após correção não-trivial |
| `docs-keeper` | sonnet | Atualiza `docs/` canônica após "sim" do humano. Cria ADRs quando há decisão arquitetural nova |
| `task-documenter` | sonnet | (Opcional) Gera doc da task em md/docx/pdf, nível leigo/moderado/técnico. Output em `docs/tasks/<slug>/` |
| `technical-designer` | sonnet | Redige ADRs em `docs/architecture/decisions/NNNN-<tema>.md`. Não toca código |
| `onboarding-guide` | sonnet | Apresenta o projeto a devs novos. Pergunta o que quer antes de responder. Usa só `docs/` e `CLAUDE.md` |
| `commit-composer` | sonnet | Inspeciona git diff, agrupa em commits (máx 4 arquivos/commit), pede confirmação humana, **executa** `git add`/`git commit`. Sem trailer Claude |
| `pr-opener` | **haiku** | `git push -u origin <branch>` + `gh pr create --base develop` com body estruturado. Sem trailer Claude |
| `pr-reviewer` | **opus** | Revisão completa de PR: gate bloqueante (typecheck/lint/build/test/e2e/cobertura 100%) + 6 analisadores em paralelo + comentário no GitHub |
| `uazapi-expert` | sonnet | Integração com uazapi (gateway WhatsApp Baileys) aplicando padrões do template |

---

## Inventário de comandos (slash commands)

| Comando | Arquivo | Propósito |
|---|---|---|
| `/execute-task` | `commands/execute-task.md` | Inicia task via conductor correto (detecta fullstack / backend / frontend) |
| `/review` | `commands/review.md` | Roda esteira completa de 6 analisadores em paralelo no diff atual. APPROVE strict |
| `/pr-review` | `commands/pr-review.md` | Chama `pr-reviewer` numa PR/branch inteira. Gate + 6 analisadores + comentário GitHub |
| `/reflect` | `commands/reflect.md` | Audita a sessão, propõe deltas no CLAUDE.md/docs/agents. Não edita sem aprovação |
| `/document-task` | `commands/document-task.md` | Gera doc de uma task específica (md/docx/pdf, nível leigo/moderado/técnico) |
| `/onboarding` | `commands/onboarding.md` | Apresenta o projeto a dev novo via `onboarding-guide` |
| `/commit` | `commands/commit.md` | Chama `commit-composer` direto. Executa após confirmação humana. Pergunta PR no fim |
| `/create-pr` | `commands/create-pr.md` | Chama `pr-opener` direto. Publica branch + abre PR pra `develop` |
| `/continue-task` | `commands/continue-task.md` | **NOVO** — lista tasks ativas/pausadas do time (%, autor, branch, data), permite escolher qual retomar |
| `/create-task-clickup` | `commands/create-task-clickup.md` | **NOVO (v2.1, opcional)** — cria task rica no ClickUp via MCP. List ID/prefixo do PROJECT.md |
| `/execute-task-clickup` | `commands/execute-task-clickup.md` | **NOVO (v2.1, opcional)** — puxa task do ClickUp e delega ao conductor (ponte → workflow existente) |

---

## Padrões críticos dos agentes revisores

### Formato do Veredicto (copiar exatamente)

Cada agente revisor usa **uma única linha** de Veredicto. Este é o formato vigente por agente:

**`code-reviewer`:**
```
**APPROVE** ⟺ 0 CRÍTICO e 0 WARNING. **REQUEST_CHANGES** ⟺ ≥1. WARNING bloqueia igual a CRÍTICO; INFO nunca bloqueia.
```

**`security-auditor`:**
```
**APPROVE** ⟺ 0 CRÍTICO e 0 WARNING. **REQUEST_CHANGES** ⟺ ≥1. WARNING bloqueia merge igual a CRÍTICO. Sem tolerância.
```

**`silent-failure-hunter`:**
```
**APPROVE** ⟺ 0 CRÍTICO e 0 WARNING. **REQUEST_CHANGES** ⟺ ≥1.
```

**`type-design-analyzer`:**
```
**APPROVE** ⟺ 0 CRÍTICO e 0 WARNING. **REQUEST_CHANGES** ⟺ ≥1. Score baixo sem CRÍTICO/WARNING específicos ainda é APPROVE — score é heurística, não o decisor.
```

**`pr-test-analyzer`:**
```
**APPROVE** ⟺ 0 CRÍTICO e 0 WARNING. **REQUEST_CHANGES** ⟺ ≥1.
```

**`clean-code-reviewer`:**
```
**APPROVE** ⟺ 0 CRÍTICO e 0 WARNING. **REQUEST_CHANGES** ⟺ ≥1. Estética em INFO nunca bloqueia; violação documentada em CLAUDE.md sobe pra WARNING/CRÍTICO.
```

### Formato da Regra de Escopo (code-reviewer)

```
Arquivo tocado no diff = sua responsabilidade. Código novo e pré-existente em arquivo modificado têm MESMA severidade (marca `(pré-existente)`). Arquivos fora do diff: não escaneia.
```

### Pipeline de revisão

A esteira é sempre disparada **EM PARALELO**:

| Agente | Quando dispara |
|---|---|
| `code-reviewer` | **Sempre** |
| `silent-failure-hunter` | **Sempre** |
| `clean-code-reviewer` | **Sempre** |
| `security-auditor` | **Sempre** — nunca é "SAFE to skip" |
| `type-design-analyzer` | Só se diff toca `domain/`, `application/`, `enterprise/` ou `core/` |
| `pr-test-analyzer` | Só se diff tem qualquer `.ts`/`.tsx`/`vitest.config*` |

**Critério APPROVE strict:** TODOS os analisadores disparados com APPROVE (0 CRÍTICO e 0 WARNING cada).

### Model right-sizing

| Modelo | Agentes |
|---|---|
| **opus** | `security-auditor`, `silent-failure-hunter`, `pr-reviewer` |
| **haiku** | `quality-fixer`, `pr-opener` |
| **sonnet** | todos os demais (25 agentes) |

---

## Sistema de Tasks por Usuário

### Convenção de nomenclatura

```
.claude/tasks/CURRENT_TASK-<username>.md   ← rastreado pelo git (uma por dev)
.claude/tasks/PAUSED/                       ← gitignored
.claude/tasks/DONE/                         ← gitignored
.claude/tasks/CURRENT_TASK.md.example       ← template, rastreado
```

### .gitignore — atualizar o bloco de tasks

```gitignore
# claude tasks: CURRENT_TASK-<username>.md são rastreados pelo git (uma por dev)
# legado — mantido pra não trackear acidentalmente o arquivo old
.claude/tasks/CURRENT_TASK.md
.claude/tasks/PAUSED/*
.claude/tasks/DONE/*
!.claude/tasks/CURRENT_TASK.md.example
!.claude/tasks/PAUSED/.gitkeep
!.claude/tasks/DONE/.gitkeep
```

### CURRENT_TASK.md.example — campos obrigatórios

```markdown
**Status:** in_progress | awaiting_approval | paused | done
**Author:** <git-username>
**Branch:** `<type>/<slug>` (a partir de `develop`)
**Progress:** 0%
**Created:** YYYY-MM-DD HH:MM
**Last update:** YYYY-MM-DD HH:MM
**Conductor:** dev-conductor | backend-conductor | frontend-conductor
```

---

## Checklist de migração passo a passo

### Passo 1 — Criar a estrutura de diretórios se não existir

```bash
mkdir -p .claude/commands/agents
```

### Passo 2 — Copiar os 7 agentes de `.claude/agents/`

Sobrescrever todos os 7 arquivos de `.claude/agents/` deste template:
`code-reviewer.md`, `security-auditor.md`, `silent-failure-hunter.md`, `type-design-analyzer.md`, `pr-test-analyzer.md`, `clean-code-reviewer.md`, `performance-engineer.md`

### Passo 3 — Copiar agentes para `.claude/commands/agents/`

Copiar todos os arquivos de `.claude/commands/agents/` deste template. Para agentes que já existiam em `.claude/agents/` no projeto antigo, o arquivo original pode ser deletado de lá (a não ser que queira manter nos dois lugares como neste template).

**Agentes novos** que muito provavelmente não existem no projeto antigo:
- `code-explorer.md`, `quality-fixer.md`, `technical-designer.md`, `pr-opener.md`, `task-documenter.md` (v1.1)
- `pr-reviewer.md` (v1.2)
- `ux-polisher.md` (v1.3)

### Passo 4 — Copiar comandos novos para `.claude/commands/`

Arquivos que provavelmente não existem:
- `execute-task.md` (substitui `new-feature.md` se existir — deletar o antigo)
- `create-pr.md`, `document-task.md`, `reflect.md` (v1.1)
- `pr-review.md` (v1.2)
- `continue-task.md` (v2.0)

### Passo 5 — Atualizar `.gitignore`

Substituir o bloco do claude tasks conforme seção "Sistema de Tasks" acima.

### Passo 6 — Atualizar `.claude/tasks/CURRENT_TASK.md.example`

Adicionar campos `Author`, `Branch`, `Progress` e seção `## Lições aplicáveis` conforme seção acima.

### Passo 7 — Atualizar `CLAUDE.md`

- Referência a `CURRENT_TASK.md` no passo do conductor → `CURRENT_TASK-<username>.md (uma por dev, rastreada pelo git)`
- Adicionar no bloco de Atalhos: `- /continue-task — lista todas as tasks ativas e pausadas do time (com %, autor, branch, data), permite escolher qual retomar.`

### Passo 8 — (Opcional) Renomear task ativa existente

```bash
USERNAME=$(gh api user --jq .login 2>/dev/null || git config user.name | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
mv .claude/tasks/CURRENT_TASK.md ".claude/tasks/CURRENT_TASK-${USERNAME}.md"
git add ".claude/tasks/CURRENT_TASK-${USERNAME}.md"
git rm --cached .claude/tasks/CURRENT_TASK.md 2>/dev/null || true
```

### Passo 9 — Validação

```bash
ls .claude/agents/          # 7 arquivos
ls .claude/commands/agents/ # ≥19 arquivos
ls .claude/commands/        # ≥9 arquivos (incluindo continue-task.md)
git ls-files .claude/tasks/CURRENT_TASK-*.md  # deve listar o(s) arquivo(s) do time
```

---

## Referências

- Inventário de agentes com docs completas: `docs/agents/GUIA.md`
- Regras de arquitetura e padrões obrigatórios: `CLAUDE.md`
- Lições acumuladas do projeto: `docs/_internal/lessons.md`
- ADRs: `docs/architecture/decisions/`
