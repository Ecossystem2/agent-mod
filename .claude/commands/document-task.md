---
description: Gera documentação de uma task específica em md/docx/pdf, em nível leigo/moderado/técnico via task-documenter. Output em docs/tasks/<slug>/<nivel>.<ext>. Pergunta sempre antes (Sim/Não, formato, nível).
---

Você acabou de receber um pedido pra gerar documentação de uma task.

## 1. Identifique a task alvo

- `$ARGUMENTS` vazio → use a task mais recente em `.claude/tasks/DONE/` (`ls -t .claude/tasks/DONE/ | head -1`) OU o `CURRENT_TASK.md` se ainda não foi arquivado.
- `$ARGUMENTS` é um slug → procure em `.claude/tasks/DONE/*<slug>*.md` ou `.claude/tasks/PAUSED/*<slug>*.md`.
- `$ARGUMENTS` é um caminho → use direto.

Se ambíguo (vários matches ou nenhum), liste e pergunte qual.

## 2. Acione o `task-documenter` via Agent tool (foreground)

No prompt, inclua:
- Caminho do arquivo da task identificado em (1).
- Range de commits inferido (ou `git log --since="<data>"` se a task tem data no nome).
- Instrução: "siga `docs/workflows/documentation-standards.md`. Pergunte ao humano: Sim/Não, formato (md/docx/pdf), nível (leiga/moderada/técnica). Default: Moderada. Saída em `docs/tasks/<slug>/<nivel>.<ext>`."

## 3. Quando o `task-documenter` retornar

Mostre ao usuário:
- Caminho dos arquivos gerados (md sempre; docx/pdf se aplicável e pandoc disponível).
- Resumo curto do que foi documentado.
- Aviso se pandoc faltou e o user pediu docx/pdf.

## NÃO FAZER

- ❌ Gerar a doc você mesmo — quem gera é o `task-documenter`.
- ❌ Pular as 3 perguntas — sempre via `AskUserQuestion` dentro do agente.
- ❌ Sobrescrever `docs/architecture/`, `docs/domain/`, `docs/infra/` — esse é o `docs-keeper`.
- ❌ Documentar arquivos fora do escopo da task identificada.

Pedido do usuário: $ARGUMENTS
