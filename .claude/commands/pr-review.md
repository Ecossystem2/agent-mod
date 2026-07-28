---
description: Invoca o pr-reviewer pra revisar uma PR/branch inteira — gate bloqueante (typecheck/lint/build/test/test:e2e/cobertura 100%), scans determinísticos das regras do template, esteira dos 6 analisadores em paralelo, veredicto APPROVE strict e comentário no GitHub. Espelha o pr-review do monaco.
---

Você acabou de receber um pedido de code review de uma PR.

## 1. Pré-requisitos

Confirme antes de delegar:
- `gh --version` e `gh auth status` retornam sem erro.
- Repositório tem remote no GitHub.
- Para o gate de e2e: Postgres (5432) + Redis (6379) disponíveis (`docker compose --env-file apps/api/.env up -d postgres redis`).

Se algo falhar, reporte ao humano com a instrução de fix antes de seguir.

## 2. Acione o `pr-reviewer` via Agent tool (foreground)

No prompt, passe:
- O argumento recebido: número `#N`, nome da branch, ou vazio (= branch atual contra `develop`).
- Instrução: "Execute o fluxo completo do pr-reviewer: cache por SHA, gate bloqueante (Fase 2.2), scans determinísticos (2.5) + 6 agents (3.5) EM PARALELO, agrega full-strict, e publica o comentário no GitHub com a tag `<!-- template-review-bot -->`. Veredicto APPROVE só com gate verde + 6 agents APPROVE + scans CLEAN. Não corrija código — read-only + comentário."

## 3. Quando o `pr-reviewer` retornar

Mostre ao humano:
- O veredicto global (APPROVE / REQUEST_CHANGES).
- Resultado do gate (typecheck/lint/build/test/e2e/cobertura).
- Issues CRÍTICO e WARNING que bloqueiam, em ordem de prioridade.
- URL do comentário publicado na PR.

## NÃO FAZER

- ❌ Revisar "no escuro" sem rodar o gate — o gate é bloqueante e precede mérito.
- ❌ Aprovar global com qualquer WARNING (full strict — WARNING bloqueia igual a CRÍTICO).
- ❌ Mexer no working tree (`checkout`/`stash`/`reset`/`clean`) pra rodar o gate. Se sujo ou HEAD ≠ SHA da PR, peça `gh pr checkout`.
- ❌ Filtrar a suíte de testes por arquivo/nome — sempre a suíte INTEIRA.
- ❌ Aplicar correções — o pr-reviewer é read-only + comentário. Quem corrige é o humano ou o conductor.
- ❌ Esquecer de publicar o comentário no GitHub ao final.

Pedido do usuário: $ARGUMENTS
