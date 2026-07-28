---
description: Invoca pr-opener pra publicar a branch atual (git push -u origin <branch>) e abrir PR pra develop via gh pr create. Título Conventional Commits + body estruturado com link pra task arquivada. Sem trailer Claude. Retorna URL.
---

Você acabou de receber um pedido pra abrir PR.

## 1. Pré-requisitos

Confirme antes de delegar:
- `gh --version` retorna sem erro.
- `gh auth status` retorna sem erro.
- Branch atual **não é** `main` nem `develop`.
- Working tree limpo (`git status --porcelain` vazio).
- Branch tem commits além do que tem em `develop` (`git log develop..HEAD --oneline | wc -l > 0`).

Se algum falhar, reporta ao humano com a instrução de fix.

## 2. Acione o `pr-opener` via Agent tool (foreground)

No prompt, inclua:
- Branch atual.
- Caminho do `CURRENT_TASK.md` (ou arquivo em `.claude/tasks/DONE/`) se existir.
- Range de commits (`git log develop..HEAD --oneline`).
- Instrução: "publique a branch (`git push -u origin`), monte título Conventional Commits + body estruturado (Objetivo / O que mudou / Decisões / Riscos / Arquivos principais / Checklist / Referências). Base: `develop`. **NUNCA inclua trailer Claude** no título ou body. Retorne URL do PR."

## 3. Quando o `pr-opener` retornar

Mostre ao humano:
- URL do PR.
- Branch publicada.
- Resumo do título + número do PR.
- Próximos passos (esperar CI, pedir review).

## NÃO FAZER

- ❌ Abrir PR direto via `gh` — sempre via `pr-opener`.
- ❌ Force push.
- ❌ Push pra `main`/`develop`.
- ❌ Adicionar trailer Claude no body.
- ❌ Mergear o próprio PR.

Pedido do usuário: $ARGUMENTS
