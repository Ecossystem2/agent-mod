---
description: Configura o projeto a partir do template — captura o nome do projeto (aplicado na web + dockers), faz perguntas granulares e gera docs/PROJECT.md. Deve ser executado UMA VEZ antes da primeira task. Condutores verificam esse arquivo automaticamente.
---

Você acabou de receber `/setup`. Seu papel é configurar o projeto a partir do template fazendo perguntas ao usuário e gerando `docs/PROJECT.md`.

## 1. Verifique se já existe configuração

Leia `docs/PROJECT.md`. Se existir com conteúdo real (não o placeholder "Execute /setup"), pergunte ao usuário:

> "Um `docs/PROJECT.md` já existe. Quer reconfigurar? (vai sobrescrever as escolhas atuais)"

Se disser não → encerra. Se disser sim → continua.

## 1.5. Capture o nome do projeto (OBRIGATÓRIO — sempre)

Antes de qualquer outra pergunta, pergunte ao usuário **em texto livre** (NÃO use `AskUserQuestion` — nome é campo aberto):

> "Qual é o nome do projeto? (ex: `Confeitaria ERP`)"

A partir da resposta, derive **dois formatos** e use-os no passo de aplicação (passo 2.7):

- **Nome de exibição** (`<display>`) — como o usuário digitou, com capitalização/acentos (ex: `Confeitaria ERP`). Usado na UI da web (título da aba, marca da sidebar).
- **Slug kebab-case** (`<slug>`) — minúsculo, sem acento, espaços→hífen, só `[a-z0-9-]` (ex: `confeitaria-erp`). Usado em identificadores técnicos: `name:` do docker-compose, `POSTGRES_DB`, `storageKey` do tema, e (opcional) o scope `@<slug>/*`.

Confirme os dois valores derivados com o usuário antes de aplicar (mostre "Nome: X / Slug: y").

## 2. Faça as perguntas via AskUserQuestion

Use **DUAS chamadas separadas** para AskUserQuestion porque auth e email precisam de multi-select.

### Chamada 1 — Tipo + Upload + Domínio (3 perguntas, single-select)

**Pergunta 1 — Tipo de sistema** (header: "Tipo")
- "Ferramenta interna" — equipe interna, usuários conhecidos, sem cadastro público
- "SaaS / produto" — usuários externos, cadastro público, potencialmente multi-tenant
- "API pura" — sem frontend próprio, só backend para consumo externo

**Pergunta 2 — Upload de arquivos** (header: "Upload")
- "Não precisa" — sem upload de arquivo no escopo inicial
- "Sim, precisa" — upload de documentos, imagens ou arquivos pelo usuário

**Pergunta 3 — Domínio de negócio** (header: "Domínio")
- "Gestão (ERP / CRM / RH)"
- "E-commerce / pedidos"
- "Comunicação / mensagens"
- "Plataforma de conteúdo / SaaS genérico"
(sempre há "Other" automático para texto livre)

### Chamada 2 — Fluxos de auth + Tipos de email (2 perguntas, multi-select)

**Pergunta 4 — Fluxos de auth UI que o projeto precisa** (header: "Auth UI", multiSelect: true)
- "Página de login" — tela de login com email + senha
- "Esqueci minha senha" — formulário que dispara email de reset
- "Reset de senha" — página que recebe o token e define nova senha
- "Cadastro público (sign-up)" — usuário cria a própria conta (SaaS)
- "Nenhum" — auth gerenciada externamente (SSO, Azure AD, etc.) ou sem auth UI

> Importante: estas opções são independentes. Ex: pode marcar "Página de login" sem marcar "Esqueci minha senha" e "Reset de senha" — isso é válido para sistemas internos onde a senha é gerenciada pelo admin.

**Pergunta 5 — Tipos de email transacional que o projeto precisa** (header: "Email", multiSelect: true)
- "Boas-vindas ao criar conta"
- "Reset de senha (link por email)"
- "Notificações do sistema"
- "Nenhum" — sistema sem envio de email

## 2.5. (Opcional) Integração com ClickUp para gerência de tasks

Esta etapa é **opcional** e independente das anteriores. O workflow local de tasks (`/execute-task` + `.claude/tasks/`) é o default e **continua funcionando do mesmo jeito** estando o ClickUp habilitado ou não. O ClickUp só adiciona uma fonte alternativa de tasks (criar/puxar via MCP).

### Pergunta 6 — Quer integrar com o ClickUp? (header: "ClickUp", single-select)
- "Não" — usar só o workflow local de tasks (`.claude/tasks/`). **Default.**
- "Sim" — habilitar `/create-task-clickup` (criar task rica no ClickUp) e `/execute-task-clickup <PREFIXO-N>` (puxar task do ClickUp e rodar o conductor).

Se "Não" → registre ClickUp como **não habilitado** no PROJECT.md (seção abaixo) e siga para o passo 3.

Se "Sim" → descubra o **List ID** que vai guardar as tasks deste projeto:

1. **Verifique se o MCP do ClickUp está conectado nesta sessão.** As tools `clickup_get_workspace_hierarchy`, `clickup_search`, `clickup_create_task` etc. (servidor `claude_ai_ClickUp`) só existem se o conector ClickUp do claude.ai estiver ligado na conta.
   - **Se NÃO estiver disponível:** avise o usuário:
     > "O MCP do ClickUp não está conectado. Ligue o conector ClickUp em **claude.ai → Settings → Connectors** e rode `/setup` de novo — ou me passe o **List ID** manualmente agora que eu gravo a config (você liga o conector depois)."
     - Se o usuário colar o List ID → use-o direto (pule a descoberta automática).
     - Se preferir ligar depois → grave `Habilitado = Sim` com `List ID = <pendente>` e oriente preencher manualmente no PROJECT.md.
   - **Se estiver disponível:** siga a descoberta abaixo.

2. **Descoberta via MCP** — chame `clickup_get_workspace_hierarchy` e navegue Workspace → Space → List com o usuário:
   - Apresente os workspaces (teams) e deixe o usuário escolher. Use `AskUserQuestion` quando houver ≤4 opções por nível; se houver mais, mostre uma lista numerada e peça o usuário digitar a escolha.
   - Dentro do workspace escolhido, apresente os spaces; depois as lists (folderless + lists dentro de folders). O usuário escolhe a **list** que vai concentrar as tasks deste projeto.
   - Anote o **List ID** e o **nome da list** resolvidos.

3. **Pergunta 7 — Prefixo de task** (header: "Prefixo"): pergunte o prefixo curto para o título das tasks (ex: `PM` para "Projeto Monaco", `ACME`, etc.). O padrão de título será `<PREFIXO>-{N} [CATEGORIA] {descrição}`. Default sugerido: derive 2-4 letras do nome do domínio/projeto. Confirme com o usuário.

Grave List ID + nome da list + prefixo no PROJECT.md (seção "Integração ClickUp").

## 2.7. Aplique o nome do projeto na web e nos dockers (OBRIGATÓRIO)

Com `<display>` e `<slug>` do passo 1.5, edite os arquivos abaixo trocando o placeholder `Template`/`template` pelo nome do projeto. Use `Edit` — não reescreva os arquivos inteiros.

### Web (usa `<display>`)

- `apps/web/index.html` — `<title>Template</title>` → `<title><display></title>`.
- `apps/web/src/components/layout/sidebar.tsx` — a marca `<span className="text-lg font-semibold tracking-tight">Template</span>` → `<display>`; e o rodapé `Template DDD` → `<display>` (ou `<display> DDD` se o usuário preferir manter o sufixo).

### Web — identificador técnico (usa `<slug>`)

- `apps/web/src/App.tsx` — `storageKey="template-theme"` → `storageKey="<slug>-theme"`.

### Docker (usa `<slug>`)

- `docker-compose.yml` — `name: template` → `name: <slug>`; e todos os defaults `POSTGRES_DB` (`${POSTGRES_DB:-template}` no `environment` **e** nos dois `healthcheck`) → `${POSTGRES_DB:-<slug>}`.
- `docker-compose.blue.yml` / `docker-compose.green.yml` / `docker-compose.shared.yml` — se o usuário usa o fluxo blue/green, troque o prefixo `apps-` de `name:` (`apps-blue`/`apps-green`/`apps-shared`) por `<slug>-` para evitar colisão de `COMPOSE_PROJECT_NAME` entre projetos na mesma máquina. Se não usar blue/green, deixe como está e mencione que pode ajustar depois.

### Scope do monorepo (opcional — usa `<slug>`)

Renomear `@apps/*` → `@<slug>/*` nos `package.json` é o passo maior descrito no CLAUDE.md (§1). Pergunte se o usuário quer fazer agora ou depois. Se **agora**: troque `@apps/` por `@<slug>/` em todos os `package.json` do workspace **e** nas referências de import/paths (`tsconfig*.json`, imports `from '@apps/...'`). Se **depois**: registre como pendência no "Guia para condutores" do PROJECT.md. Não faça pela metade — ou renomeia tudo, ou nada.

## 3. Gere docs/PROJECT.md

Com base nas respostas, escreva o arquivo usando este template:

```markdown
# Configuração do Projeto

> Gerado pelo /setup. Atualize conforme o projeto evolui.
> Lido automaticamente pelos condutores antes de cada task.

## Contexto

- **Nome:** <display> (`<slug>`)
- **Domínio:** <resposta da pergunta 3>
- **Tipo:** <Ferramenta interna | SaaS / produto | API pura>

## Funcionalidades habilitadas

### Auth UI

| Fluxo | Habilitado |
|---|---|
| Página de login | <Sim / Não> |
| Esqueci minha senha | <Sim / Não> |
| Reset de senha (link por email) | <Sim / Não> |
| Cadastro público (sign-up) | <Sim / Não> |

> <Contexto curto, ex: "Usuários são criados pelo admin — não há cadastro público nem reset por email. Login próprio habilitado.">

### Email transacional

| Tipo de email | Habilitado |
|---|---|
| Boas-vindas ao criar conta | <Sim / Não> |
| Reset de senha | <Sim / Não> |
| Notificações do sistema | <Sim / Não> |

### Outras funcionalidades

| Funcionalidade | Habilitado |
|---|---|
| Upload de arquivos | <Sim / Não> |
| Frontend (`apps/web/`) | <Sim / Não — Não somente se tipo = "API pura"> |

## Integração ClickUp (gerência de tasks)

| Config | Valor |
|---|---|
| Habilitado | <Sim / Não> |
| List ID | <id resolvido | — quando Não> |
| Nome da list | <nome da list | — quando Não> |
| Prefixo de task | <ex: PM | — quando Não> |

> Quando **Habilitado = Sim**: use `/create-task-clickup <descrição>` para criar uma task rica no ClickUp e `/execute-task-clickup <PREFIXO-N>` para puxar uma task do ClickUp e rodar o mesmo fluxo do conductor (CURRENT_TASK + esteira de revisão + commit + PR). O workflow local (`/execute-task <descrição>` com `.claude/tasks/`) continua disponível em paralelo — ClickUp é fonte alternativa, não substituta.
> Quando **Habilitado = Não**: as duas skills de ClickUp não devem ser usadas; use só o workflow local de tasks.

## Guia para condutores

<Parágrafo em texto livre sintetizando as escolhas. Seja específico sobre o que NÃO está no escopo, pois é o que os condutores precisam saber para não propor features desnecessárias. Exemplos:>

"Ferramenta interna de gestão. Usuários são criados pelo admin — sem cadastro público. Login próprio habilitado, mas sem fluxo de esqueci-senha ou reset por email (senha gerenciada pelo admin). Sem email transacional. Upload de arquivos não é escopo inicial."

OU

"SaaS com usuários externos. Login, esqueci-senha e reset de senha estão no escopo. Email de boas-vindas e reset são necessários. Upload de arquivos está no escopo. Cadastro público (sign-up) não está no escopo inicial — usuários são criados via convite."

## Arquivos de template não utilizados neste projeto

<Liste SOMENTE os arquivos que o projeto definitivamente não vai usar. Seja granular — não liste tudo de uma vez se só parte não é usada.>

<Se "Esqueci minha senha" = Não:>
- `apps/web/src/features/auth/pages/forgot-password-page.tsx`

<Se "Reset de senha" = Não:>
- `apps/web/src/features/auth/pages/reset-password-page.tsx`
- `apps/api/src/infra/mail/templates/reset-password-email.tsx`

<Se "Página de login" = Não E "Esqueci" = Não E "Reset" = Não E "Sign-up" = Não:>
- `apps/web/src/features/auth/` (pasta inteira)

<Se "Boas-vindas" = Não E "Reset de senha" = Não E "Notificações" = Não:>
- `apps/api/src/infra/mail/templates/`
- `apps/api/src/infra/mail/render-email.ts`
- `apps/api/src/infra/mail/nodemailer-mail-provider.ts`
(somente se TODOS os tipos de email forem Não — se algum for Sim, manter a pasta)

<Se apenas "Reset de senha" = Não mas outros emails = Sim:>
- `apps/api/src/infra/mail/templates/reset-password-email.tsx` (somente este arquivo)

<Se "Boas-vindas" = Não:>
- `apps/api/src/infra/mail/templates/welcome-email.tsx`

<Se Upload = Não:>
- `apps/api/src/infra/storage/disk-storage.ts`
- `apps/api/src/infra/storage/s3-storage.ts`

<Se API pura (tipo = "API pura"):>
- `apps/web/` (pasta inteira do frontend)
```

## 4. Pergunte se quer remover os arquivos não utilizados

Se houver arquivos na seção "Arquivos de template não utilizados", pergunte:

> "Quer que eu remova agora os arquivos que não serão usados? Isso deixa o repositório mais limpo, mas pode ser feito depois também."

- **Sim** → delete os arquivos listados um por um com `rm`. Nunca delete pastas inteiras sem confirmar o conteúdo. Nunca delete código de negócio já escrito.
- **Não** → encerra sem remover. Os arquivos ficam documentados em `docs/PROJECT.md`.

## 5. Encerre com orientação

```
✓ docs/PROJECT.md criado.

Próximos passos:
1. Faça commit: /commit
2. Inicie sua primeira task: /execute-task <descrição>
   <Se ClickUp habilitado:> ou, via ClickUp: /create-task-clickup <descrição> → /execute-task-clickup <PREFIXO-N>

Os condutores vão ler docs/PROJECT.md automaticamente antes de cada task.
```

## NUNCA FAZER

- ❌ Tratar "Página de login" como dependente de "Esqueci minha senha" — são fluxos independentes.
- ❌ Assumir que se marcou "Reset de senha", necessariamente precisa do email de reset — verificar separadamente.
- ❌ Listar arquivo como "não utilizado" se o usuário não respondeu claramente que não precisa.
- ❌ Remover arquivos sem confirmar com o usuário.
- ❌ Sobrescrever PROJECT.md sem perguntar se já existe com conteúdo.
- ❌ Forçar a integração ClickUp — ela é opcional; o default é "Não" (workflow local).
- ❌ Hardcodar o List ID do ClickUp em qualquer skill/comando — ele vive só no `docs/PROJECT.md` deste projeto (o template é clonado por projeto, cada um com sua list).
- ❌ Criar a list no ClickUp pelo usuário — apenas selecione uma list existente na hierarquia. Se não houver list adequada, peça ao usuário criar no ClickUp e rodar `/setup` de novo.
