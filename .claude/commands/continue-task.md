---
description: Lista todas as tasks ativas e pausadas do time (com resumo, %, autor e última atualização), permite escolher qual retomar.
---

Você acabou de receber um pedido para continuar uma task.

## 1. Colete os arquivos de task

```bash
ls .claude/tasks/CURRENT_TASK-*.md 2>/dev/null
ls .claude/tasks/PAUSED/*.md 2>/dev/null | grep -v ".gitkeep"
```

Se nenhum arquivo encontrado → responda: "Nenhuma task ativa ou pausada. Use `/execute-task` para iniciar uma nova."

## 2. Leia cada arquivo e extraia

Para cada arquivo leia **completo** e extraia:

- **titulo**: primeira linha do arquivo (sem o `# CURRENT_TASK — `)
- **autor**: campo `**Author:**` — se ausente, use o nome do arquivo (`CURRENT_TASK-<nome>.md`)
- **branch**: campo `**Branch:**`
- **last_update**: campo `**Last update:**` — se ausente, use `**Created:**`
- **conductor**: campo `**Conductor:**`
- **status**: campo `**Status:**` — `in_progress` = ativa, `paused` = pausada
- **resumo**: primeira frase não-vazia da seção `## Objetivo` (máx 120 chars)
- **progresso**: campo `**Progress:**` — se ausente, calcule: `(subtasks [x]) / (total subtasks) * 100`, arredonde pra inteiro
- **proximo_passo**: texto do primeiro subtask `[ ]` pendente (sem o `- [ ] `)

## 3. Apresente as tasks

Use `AskUserQuestion` com uma pergunta e uma opção por task (máx 4 opções + "Cancelar").

Formato de cada opção:
- **label**: `<titulo>` — `<progresso>%` feito
- **description**: `👤 <autor>  |  🕐 <last_update>  |  🌿 <branch>\n📋 <resumo>\n⏭ Próximo: <proximo_passo>`

Se houver mais de 4 tasks, liste em texto numerado antes da pergunta:

```
Tasks disponíveis:

[1] <titulo> — <progresso>% feito
    👤 <autor>  |  🕐 <last_update>  |  🌿 <branch>
    📋 <resumo>
    ⏭  Próximo: <proximo_passo>

[2] ...
```

E pergunte: "Qual task deseja retomar? (número ou 0 para cancelar)"

## 4. Retome a task escolhida

1. Leia o arquivo da task selecionada por completo.
2. Mostre ao usuário um painel de contexto antes de acionar o conductor:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Retomando: <titulo>
Branch: <branch>
Conductor: <conductor>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Objetivo: <objetivo completo da seção>
Decisões já tomadas: <lista de decisões da seção ## Decisões>
Próximos passos: <todos os subtasks [ ] pendentes>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

3. Se branch atual ≠ branch da task:
   ```bash
   git checkout <branch-da-task>
   ```

4. Acione o conductor correto via Agent tool com instrução explícita:
   **"NÃO crie nova task. A task já existe em `<caminho-do-arquivo>`. Retome a partir do primeiro subtask `[ ]` pendente. Leia o arquivo completo antes de agir."**
