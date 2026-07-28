---
description: (Opcional — requer ClickUp habilitado no /setup) Puxa uma task do ClickUp pelo ID (ex: PM-2), apresenta análise de requisitos e delega ao conductor (mesmo fluxo do /execute-task local: CURRENT_TASK + esteira de revisão + commit + PR).
---

Dado um ID de task do ClickUp (ex: `PM-2`), puxe a task via MCP e rode o ciclo completo até abrir PR — reaproveitando o conductor do template.

## Parâmetros

- **Task ID**: `$ARGUMENTS` (obrigatório — ID da task no ClickUp, ex: `PM-2`)

## Pré-requisitos (verifique ANTES de qualquer coisa)

1. **ClickUp habilitado** — leia `docs/PROJECT.md`, seção "Integração ClickUp". Se `Habilitado = Não` (ou não configurado): **pare** e informe:
   > "ClickUp não está habilitado neste projeto. Rode `/setup` e habilite a integração — ou use o workflow local `/execute-task <descrição>`."
2. **List ID** — extraia o `List ID` da mesma seção (usado pra localizar a task). Se `<pendente>`/vazio, peça preencher e pare.
3. **MCP conectado** — as tools `clickup_search`/`clickup_get_task` precisam existir nesta sessão. Se não, avise pra ligar o conector ClickUp em claude.ai → Settings → Connectors e pare.

## Processo

### 1. Buscar a task no ClickUp

```
clickup_search com keywords="$ARGUMENTS" filtrando location.projects=["<LIST_ID do PROJECT.md>"]
```

Achou a task → busque detalhes completos:

```
clickup_get_task com task_id=<id interno encontrado> detail_level=detailed
```

Se não encontrar, avise o usuário e pare.

### 2. Apresentar análise de requisitos

Extraia da task: título, descrição completa, critérios de aceite (descrição ou comentários), prioridade, tags, dependências (links), comentários relevantes. Apresente:

```markdown
## 📋 Análise de Requisitos — {PREFIXO}-{N}

### Objetivo Principal
{o que a task resolve}

### Requisitos Funcionais
- [ ] ...

### Requisitos Não-Funcionais
- [ ] {performance, segurança, paginação, cache}

### Critérios de Aceite
- [ ] ...

### Dependências
- {tasks/features que esta depende}

### Riscos Identificados
- {edge cases, áreas críticas}
```

Pergunte: **"Os requisitos estão corretos?"** Aguarde confirmação. Se o usuário ajustar, incorpore antes de seguir.

### 3. Delegar ao conductor (mesmo fluxo do /execute-task local)

Classifique o escopo a partir da task (igual ao `/execute-task`):
- **Fullstack** (toca `apps/api/` E `apps/web/`, ou muda contrato visível pro front) → `dev-conductor`
- **Só backend** (só `apps/api/`, `packages/`, schema Prisma, jobs, webhooks) → `backend-conductor`
- **Só frontend** (só `apps/web/`) → `frontend-conductor`
- Em dúvida → `dev-conductor`.

Acione o conductor via Agent tool (foreground). No prompt do conductor inclua:
- O **título + descrição + critérios de aceite** extraídos da task (não o ID solto — o conteúdo).
- O **ID e a URL** da task no ClickUp.
- Qualquer contexto já mencionado nesta conversa.
- Instrução explícita: *"Crie `.claude/tasks/CURRENT_TASK-<username>.md` a partir desta task do ClickUp. Registre na seção **Referências** a linha `- ClickUp: Closes {PREFIXO}-{N} — <URL>` para o `pr-opener` incluir no body do PR. PARE pra aprovação humana antes de codar. Siga o workflow normal (branch a partir de `develop` → especialistas → esteira de revisão APPROVE strict → commit → PR pra develop)."*

A partir daqui o **conductor conduz** — ele faz branch, delega especialistas, roda a esteira de revisão (4 sempre + 2 por gatilho), pede as confirmações humanas, chama `commit-composer` e `pr-opener`. Esta skill **não** reimplementa nada disso; só garante a origem ClickUp e o link de fechamento.

### 4. Fechamento da task no ClickUp (após PR aberto)

Quando o `pr-opener` retornar a URL do PR, o body já inclui `Closes {PREFIXO}-{N}` + URL da task (via Referências do CURRENT_TASK). Pergunte ao usuário se quer **comentar a URL do PR na task do ClickUp**:

> "Quer que eu adicione um comentário na task {PREFIXO}-{N} com o link do PR?"

Se "sim" → `clickup_create_comment` na task com a URL do PR. Se "não" → encerra.

## Validações

- **Task não encontrada** → avise e pare (não invente requisitos).
- **ClickUp não habilitado / MCP indisponível** → ver Pré-requisitos.
- **Branch limpa / base atualizada** → quem garante é o conductor no passo 2.5 dele; não duplique aqui.

## Regras

1. Sempre português brasileiro.
2. NUNCA pular a confirmação de requisitos (passo 2) nem as confirmações humanas do conductor.
3. NÃO reimplementar o pipeline de review/commit/PR — **delegue ao conductor**. Esta skill é a "ponte ClickUp → conductor".
4. List ID vem **sempre** do `docs/PROJECT.md` — nunca hardcode.
5. O link de fechamento (`Closes {PREFIXO}-{N}` + URL) vai no body do PR via seção **Referências** do `CURRENT_TASK.md` — não invente outro mecanismo.
6. Respeite o escopo do `docs/PROJECT.md` — se a task pede algo fora do habilitado, sinalize ao usuário antes de delegar.

## Exemplo de uso

```
/execute-task-clickup PM-2
/execute-task-clickup PM-15
```
