---
description: (Opcional — requer ClickUp habilitado no /setup) Cria uma task rica direto no ClickUp partindo de uma descrição livre — explora o código, cruza com CLAUDE.md + docs/, e estrutura a task pronta pra ser consumida pelo /execute-task-clickup.
---

Dado uma descrição livre de feature/bug/melhoria, monte uma task explicativa e crie no ClickUp via MCP.

## Parâmetros

- **Descrição**: `$ARGUMENTS` (obrigatório — texto livre descrevendo a feature/bug)

## Pré-requisitos (verifique ANTES de qualquer coisa)

1. **ClickUp habilitado** — leia `docs/PROJECT.md`, seção "Integração ClickUp". Se `Habilitado = Não` (ou o arquivo não foi configurado): **pare** e informe:
   > "ClickUp não está habilitado neste projeto. Rode `/setup` e escolha habilitar a integração — ou use o workflow local `/execute-task <descrição>`."
2. **List ID** — extraia o `List ID` da mesma seção. Se estiver `<pendente>` ou vazio, peça ao usuário preencher o PROJECT.md (ou rodar `/setup` de novo) e pare.
3. **Prefixo** — extraia o `Prefixo de task` (ex: `PM`). É o prefixo do título.
4. **MCP conectado** — as tools `clickup_search`/`clickup_create_task` (servidor `claude_ai_ClickUp`) precisam existir nesta sessão. Se não existirem, avise pra ligar o conector ClickUp em claude.ai → Settings → Connectors e pare (ou mostre o draft pra salvar local — ver Validações).

Nunca hardcode o List ID — ele vem **sempre** do `docs/PROJECT.md`.

## Convenção de título (obrigatória)

```
{PREFIXO}-{N} [CATEGORIA] {Descrição}
```

- **PREFIXO** = vem do PROJECT.md
- **N** = próximo número disponível, descoberto na Etapa 2
- **CATEGORIA** = uma das canônicas:

| Categoria    | Quando usar                                          |
| ------------ | ---------------------------------------------------- |
| `[SETUP]`    | Config, tooling, env, lint, package manager          |
| `[INFRA]`    | Monorepo, build, CI/CD, scripts, docker, jobs        |
| `[BACKEND]`  | `apps/api` — módulos NestJS, use-cases, schema Prisma |
| `[FRONTEND]` | `apps/web` — UI React/Vite                           |
| `[AUTH]`     | Identity, RBAC, sessão, better-auth                  |
| `[DOCS]`     | Apenas atualização de documentação                   |

Se a task toca múltiplas categorias, escolha a **predominante**. Empate: `[BACKEND]` > `[FRONTEND]` > `[INFRA]` > `[DOCS]`. Título inteiro ≤80 chars.

## Processo

### 1. Receber input

`$ARGUMENTS` é texto livre. Se vier vazio, peça uma descrição e pare.

### 2. Descobrir próximo número {PREFIXO}-N

Use `clickup_search` pra varrer as tasks da list canônica com o prefixo:

```
clickup_search com:
  keywords="{PREFIXO}-"
  filters: { asset_types: ["task"], location: { subcategories: ["<LIST_ID do PROJECT.md>"] } }
  sort: [{ field: "created_at", direction: "desc" }]
  count: 50
```

Pra cada task, extraia o número via regex `^{PREFIXO}-(\d+)\s`. **Próximo número = max + 1**. Se nenhuma task existir, começa em `{PREFIXO}-1`. Pagine via `cursor` se houver >50.

### 3. Clarificações (só se necessário)

Se a descrição for ambígua, faça **no máximo 3 perguntas** (multi-choice quando possível, uma por vez): escopo (só API? + UI?), bounded context afetado (módulo existente? novo?), áreas críticas (auth? PII? integração externa?). Se já estiver clara, **pule**.

### 4. Exploração do código

Use o subagent `Explore` pra mapear:
1. Bounded context relevante (`apps/api/src/domain/` + `apps/api/src/infra/`)
2. Padrões similares já resolvidos no repo
3. Arquivos prováveis a criar/modificar (paths relativos do root)
4. Pontos de integração (módulos Nest, controllers, ports, schema Prisma)

### 5. Cruzamento com docs canônicos

Sempre leia:
- `CLAUDE.md` (regras duras: layering `infra → domain → core`, Either/UseCaseError, padrões obrigatórios §4, NÃO over-engineer §10)
- `docs/PROJECT.md` (escopo do projeto — não proponha feature fora do que está habilitado)

Quando aplicável:
- `docs/architecture/decisions/` (ADRs — se a task encosta em decisão já registrada)
- `docs/_internal/lessons.md` (lições passadas relevantes ao escopo)
- specs de agente em `.claude/commands/agents/` (ex: `security-auditor.md` se toca auth/PII; `frontend-engineer.md` se toca `apps/web`)

### 6. Montar draft da task

Markdown **enxuto** pro campo `markdown_description`. É briefing de requisitos/contexto/atenção — **não** tutorial de implementação. Quem implementa (`/execute-task-clickup` + conductor + especialistas) decide o **como** com base no CLAUDE.md.

Estrutura sugerida:

```markdown
## 🎯 Objetivo
{o que e por quê — 1-3 frases}

## 📋 Contexto
{estado atual relevante do BC}

## ✅ Requisitos Funcionais
- [ ] ...

## 🔒 Requisitos Não-Funcionais
- [ ] {performance, segurança, paginação, cache — quando aplicável}

## 📂 Arquivos a Criar/Modificar
| Arquivo | Mudança |
|---|---|
| `apps/api/src/...` | ... |

## 💡 Pontos de Atenção
- {3-7 bullets de WHY/WHAT — decisões/patterns chave, sem HOW. Referencie a regra do CLAUDE.md, não a reescreva. Ex: "Use-case retorna Either, controller traduz Left — §3"}

## ⚠️ Riscos & Edge Cases
- ...

## 🔗 Dependências
- {outras tasks/features}

## ✓ Definition of Done
- [ ] Esteira de revisão APPROVE strict — 4 sempre (`code-reviewer`, `silent-failure-hunter`, `clean-code-reviewer`, `security-auditor`) + 2 por gatilho de path (`type-design-analyzer`, `pr-test-analyzer`)
- [ ] Cobertura 100% (line/branch/function/statement) — pirâmide unit + integration + e2e
- [ ] `lint + type-check + test + build` verdes
- [ ] `docs/` atualizado pelo `docs-keeper` se mudou comportamento canônico
```

### 7. Confirmar com o humano

Apresente o título montado (`{PREFIXO}-{N} [CATEGORIA] {Descrição}`) + o draft. Pergunte: **"Pode criar essa task no ClickUp?"**. **NUNCA crie antes do "sim".**

### 8. Criar no ClickUp via MCP

Após confirmação:

```
clickup_create_task com:
  list_id="<LIST_ID do PROJECT.md>"
  name="{PREFIXO}-{N} [CATEGORIA] {Descrição}"
  markdown_description=<Markdown do passo 6>
  priority=<urgent|high|normal|low>
  tags=<backend, frontend, auth, security, infra, etc.>
```

Mapeamento de prioridade: bug em prod/vuln ativa → `urgent`; bloqueador de release → `high`; feature/refactor planejado → `normal`; tech debt/nice-to-have → `low`.

### 9. Retornar resultado

```markdown
✅ Task criada no ClickUp

**ID**: {PREFIXO}-{N}
**Título**: <título completo>
**Prioridade**: <...>
**URL**: <url retornada pelo MCP>

### Próximo passo
Pra implementar agora: `/execute-task-clickup {PREFIXO}-{N}`
```

## Validações

- **Descrição vazia** → peça e pare.
- **ClickUp não habilitado / List ID pendente** → ver Pré-requisitos.
- **MCP indisponível** → mostre o draft completo + erro e pergunte se quer salvar local em `.claude/tasks/CURRENT_TASK-<username>.md` como rascunho (não cria no ClickUp).
- **Ambiguidade severa** → após 3 perguntas, pare e peça reformulação.
- **Categoria incerta** → use a tabela de empate.

## Regras

1. Sempre português brasileiro.
2. **Não escrever código de implementação na task.** É briefing, não tutorial. Snippets ≤5 linhas só quando esclarecem ambiguidade (shape de payload, schema Zod específico).
3. NUNCA criar a task no ClickUp antes da confirmação humana.
4. NUNCA inventar requisitos que o usuário não pediu — peça clarificação.
5. Sempre mapear arquivos com paths relativos do root.
6. List ID e prefixo vêm **sempre** do `docs/PROJECT.md` — nunca hardcode.
7. Cruzar com `security-auditor.md` + §4 do CLAUDE.md é obrigatório se a task toca: auth, RBAC, PII, persistência, validação de input, integração externa, webhooks.
8. Respeite o escopo do `docs/PROJECT.md` — não proponha feature fora do que está habilitado (ex: não sugira email se "Email = Não").
9. Este repo é template (zero negócio); mas tasks criadas aqui descrevem features de um projeto **clonado** — ok descrever negócio na task, desde que o PROJECT.md já tenha sido configurado pra um projeto real.

## Exemplo de uso

```
/create-task-clickup login social com Google OAuth
/create-task-clickup adicionar paginação no endpoint GET /users
/create-task-clickup bug: rate-limit de auth não normaliza email lowercase
```
