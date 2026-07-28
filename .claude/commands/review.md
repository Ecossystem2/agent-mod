---
description: Roda a esteira completa de revisão (6 analisadores read-only EM PARALELO) sobre o diff atual. APPROVE strict — qualquer WARNING bloqueia merge.
---

Você acabou de receber um pedido de revisão de código.

## 1. Determine o escopo do diff

- `$ARGUMENTS` vazio → diff inteiro do working tree (`git diff` + `git diff --cached` + untracked relevantes).
- `$ARGUMENTS` é um caminho/glob → restringe àqueles arquivos.
- `$ARGUMENTS` é `staged`/`cached` → só `git diff --cached`.
- `$ARGUMENTS` é hash/range → `git diff <range>`.

## 2. Acione os 6 agents EM PARALELO (uma única mensagem com múltiplas Agent calls)

Os agents abaixo são **read-only** e independentes — paralelize sempre. Cada um aplica veredicto strict próprio.

| Agent | Foco específico |
|---|---|
| `security-auditor` | OWASP + auth/RBAC/headers/cookies/webhooks/secrets/log redact |
| `code-reviewer` | Padrões do template (layering, Either, sufixos, transações, allow-list, Zod, RBAC, BullMQ, cache) |
| `silent-failure-hunter` | catch vazio, ?? mascarando, Either descartado, Promise sem await, fire-and-forget sem .catch |
| `type-design-analyzer` | Encapsulamento AggregateRoot, ports vazando Prisma, value objects, pureza do domain |
| `pr-test-analyzer` | Use-case sem spec, it.only/it.skip, mock substituindo in-memory existente, asserts fracos |
| `clean-code-reviewer` | Naming, tamanho, comentários, dead code, premature abstraction |

**Briefing curto** (50–80 palavras por agent): "Audita o diff `<escopo>`. Aplica seu catálogo. Reporta APPROVE/REQUEST_CHANGES + hits CRÍTICO/WARNING/INFO no formato `arquivo:linha — problema — fix`. Foca no diff (novo + pré-existente em arquivo tocado conta). Aplica regra de bolso anti-FP antes de classificar."

## 3. Consolide o output

```markdown
## Revisão consolidada — <branch ou escopo>

### 🔒 security-auditor — APPROVE | REQUEST_CHANGES
- CRÍTICO: ...
- ALTO: ...

### 📐 code-reviewer — APPROVE | REQUEST_CHANGES
- CRÍTICO: ...
- WARNING: ...

### 💥 silent-failure-hunter — APPROVE | REQUEST_CHANGES
- CRÍTICO: ...
- WARNING: ...

### 🧱 type-design-analyzer — APPROVE | REQUEST_CHANGES
- CRÍTICO: ...
- WARNING: ...

### 🧪 pr-test-analyzer — APPROVE | REQUEST_CHANGES
- CRÍTICO: ...
- WARNING: ...

### 🧹 clean-code-reviewer — APPROVE | REQUEST_CHANGES
- CRÍTICO: ...
- WARNING: ...

### Veredicto global (strict)
✅ APPROVE  ⇔  TODOS os 6 com APPROVE
❌ REQUEST_CHANGES  ⇔  ≥1 agent com REQUEST_CHANGES (≥1 CRÍTICO ou WARNING)

Issues a corrigir antes do merge (ordem de prioridade — CRÍTICO primeiro, depois WARNING):
1. ...
```

## 4. Não corrija. Apenas reporte.

O humano decide:
- Corrige sozinho.
- Aciona conductor (`/execute-task ajustar issues da review`).
- Aciona `quality-fixer` se o problema for puramente mecânico (lint/imports/types).

## NÃO FAZER

- ❌ Sequenciar os 6 agents — eles são independentes, paraleliza sempre.
- ❌ Aplicar correções.
- ❌ Aprovar global se algum agent retornou WARNING (full strict — WARNING bloqueia igual a CRÍTICO).
- ❌ Pular agent porque "não parece relevante" — cada um cobre uma dimensão distinta.
- ❌ Sobrescrever "Falsos positivos a EVITAR" dos agents (eles já cruzam com `lessons.md` e CLAUDE.md).

Pedido do usuário: $ARGUMENTS
