---
description: Invoca commit-composer pra inspecionar o working tree, propor commits granulares (Conventional Commits estrito, máx 4 arquivos por commit), pedir confirmação humana e — se confirmado — EXECUTAR os commits direto. Atribui autoria ao contribuidor humano (config local do git), sem trailer Claude. Em seguida pergunta se quer abrir PR pra develop.
---

Você acabou de receber um pedido pra preparar e executar commits.

## 1. Acione o `commit-composer` via Agent tool (foreground)

No prompt do agente, inclua:
- `$ARGUMENTS` literalmente (pode estar vazio, ou ser um filtro como "só docs", "só apps/api", "stage atual").
- Instrução: "inspecione `git status` + `git diff`, agrupe por intenção (máx 4 arquivos por commit + ordem prescritiva), apresente plano ao humano, **peça confirmação**, e se 'sim' EXECUTE os commits. Atribuição ao contribuidor humano via config local (`user.name`/`user.email`). **NUNCA adicione trailer Claude** (Co-Authored-By: Claude, Generated with Claude, 🤖, link claude.com). Após commits, pergunte se humano quer abrir PR pra `develop`."

## 2. Quando o agente retornar com o plano

Mostre ao humano:
- Tabela de commits planejados (tipo, scope, mensagem, arquivos).
- Arquivos pulados (segredos, etc).
- Autor que vai assinar (`<user.name> <user.email>`).
- Pergunta literal: "Confirma execução? (sim / ajustar / cancelar)".

## 3. Após "sim" — agente executa direto

O `commit-composer` roda `git add` + `git commit` sequencial pra cada commit do plano. Se algum falhar (hook, conflito):
- Agente para imediatamente, reporta erro e qual commit estava sendo feito.
- Pergunte ao humano como proceder.

## 4. Após commits — handoff pro PR

Quando todos os commits passarem, o `commit-composer` mostra `git log --oneline` resumido e pergunta:

> "Abrir PR pra `develop` agora? (sim / não)"

- Se "sim" → o `commit-composer` invoca o `pr-opener` (Agent tool) passando branch + lista de commits + caminho da task. O `pr-opener` faz `git push -u origin <branch>` e abre PR via `gh pr create --base develop`.
- Se "não" → encerra. Humano cuida do push/PR depois.

## NÃO FAZER

- ❌ Executar `git push` você mesmo — quem faz isso é o `pr-opener` (e só com "sim").
- ❌ Sugerir `git commit --amend`, `git commit -a`, ou `--no-verify` (a menos que `$ARGUMENTS` peça explicitamente).
- ❌ Adicionar trailer Claude (Co-Authored-By, Generated with, 🤖, link claude.com).
- ❌ Aceitar `.env` ou arquivos de secret no plano — agente já bloqueia, mas se passar, AVISE.
- ❌ Mudar `user.name`/`user.email` via `git config` — usa o que já está local.

Pedido do usuário: $ARGUMENTS
