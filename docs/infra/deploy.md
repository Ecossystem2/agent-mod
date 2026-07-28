# Deploy

Três caminhos, do mais simples ao zero-downtime:

| Ambiente      | Estratégia                             | Gatilho                 | Runner                     |
| ------------- | -------------------------------------- | ----------------------- | -------------------------- |
| **dev/local** | `./deploy.sh` (single color, recreate) | manual                  | —                          |
| **staging**   | recreate da cor `blue`                 | push em `develop`       | self-hosted (`staging`)    |
| **produção**  | **blue-green** (zero-downtime)         | tag `vX.Y.Z` / dispatch | self-hosted (`production`) |

> O runbook de configuração (registrar runner, secrets, B2, primeiro boot) está em
> [`ci-cd-setup.md`](ci-cd-setup.md). Backup em [`backup.md`](backup.md).

---

## Topologia Blue-Green

Duas cores idênticas (`blue` / `green`) rodam o par **api + web**. Postgres e Redis
são **compartilhados** entre as cores (sobem uma vez). O nginx do host aponta o
tráfego pra cor **ativa** via um symlink; o deploy prepara a cor **idle** e só
então vira o symlink.

```
                         ┌─────────── nginx host (:80/:443) ───────────┐
                         │  symlink active.conf → blue.conf | green.conf │
                         └───────────────┬──────────────────────────────┘
                          ativa │                 │ idle (preparando)
                 ┌──────────────▼─────┐   ┌────────▼───────────┐
   projeto:      │ apps-blue          │   │ apps-green         │
   compose:      │  api :3341  web :8081│   │  api :3342  web :8082│
                 └──────────┬─────────┘   └─────────┬──────────┘
                            └──────── apps-net ──────┘
                                       │
                            ┌──────────▼───────────┐
   projeto apps-shared:     │ postgres :5432        │
                            │ redis    :6379        │  (1 só instância)
                            └───────────────────────┘
```

### Projetos compose / portas / nomes

| Projeto (`COMPOSE_PROJECT_NAME`) | Compose file(s)             | Serviços        | Portas host | Containers                         |
| -------------------------------- | --------------------------- | --------------- | ----------- | ---------------------------------- |
| `apps-shared`                    | `docker-compose.shared.yml` | postgres, redis | 5432, 6379  | `apps-postgres`, `apps-redis`      |
| `apps-blue`                      | `docker-compose.blue.yml`   | api, web        | 3341, 8081  | `apps-blue-api`, `apps-blue-web`   |
| `apps-green`                     | `docker-compose.green.yml`  | api, web        | 3342, 8082  | `apps-green-api`, `apps-green-web` |

> ⚠️ As cores usam o compose **standalone** (só `-f docker-compose.<cor>.yml`).
> Nunca mescle `-f shared -f cor`: isso adotaria o postgres dentro do projeto da
> cor e quebraria o compartilhamento. A cor alcança `postgres`/`redis` pelo nome
> de serviço através da rede externa `apps-net` (criada pelo `apps-shared`).

As portas/projetos são parametrizados por [`deploy.env`](../../deploy.env.example)
(copie o `.example` na VPS).

`deploy.env` também controla os tempos de espera do deploy:

- `POSTGRES_HEALTHCHECK_RETRIES` / `POSTGRES_HEALTHCHECK_INTERVAL`
- `POST_SWITCH_HEALTHCHECK_RETRIES` / `POST_SWITCH_HEALTHCHECK_INTERVAL`
- `HEALTHCHECK_RETRIES` / `HEALTHCHECK_INTERVAL`

---

## Fluxo de produção (tag `v*`)

Orquestrado pelos scripts em `infra/deploy/` (chamados pelo workflow
`deploy-production.yml`). Em ordem:

1. **Backup pré-deploy** — `infra/backup/backup-restic.sh` (snapshot condicional
   antes de tocar no banco; pula se o último backup saudável ainda está recente).
2. **active-color** — descobre cor ativa e a cor idle (`active-color.sh` lê o symlink do nginx).
3. **deploy-color idle** — `deploy-color.sh <idle> <tag>`: garante shared healthy → `pull` das imagens publicadas no GHCR → `up -d --no-build` da cor idle → `prisma migrate deploy` no container da cor → health-check `GET /health`.
4. **switch** — `switch.sh <idle>`: grava cor anterior, vira o symlink, `nginx -t && nginx -s reload` (reverte se inválido).
5. **verifica pós-switch** — `GET /api/health` pelo proxy público (porta 80).
6. **para cor antiga** — libera recursos da cor que saiu (containers ficam parados, não removidos).

Rollback: job manual (`workflow_dispatch` com `action: rollback`) → `rollback.sh`
reverte o symlink pra cor anterior (valida que ela ainda está saudável antes).

### Scripts (`infra/deploy/`)

| Script                        | Papel                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `lib.sh`                      | log, carregamento de `deploy.env`, wrappers `compose_for`/`shared_compose`, `container_health_check` e `health_check` |
| `active-color.sh`             | imprime cor ativa (`--idle` imprime a oposta) lendo o symlink                                                         |
| `deploy-color.sh <cor> [tag]` | prepara uma cor (build + up + migrate + health) — **não** troca tráfego                                               |
| `switch.sh <cor>`             | vira o symlink do nginx + reload                                                                                      |
| `rollback.sh`                 | reverte pra cor anterior (de `.last-active`)                                                                          |

---

## Migrations num banco compartilhado (expand/contract)

Como **as duas cores compartilham o mesmo Postgres**, durante o switch ambas as
versões do schema-cliente coexistem por instantes. Migrations **devem ser
backward-compatible**. Use o padrão **expand → contract** em releases separados:

1. **Expand** (release N): adiciona coluna/tabela **nullable** ou com default; a
   versão antiga ignora, a nova passa a escrever. Nunca renomeie/derrube nada aqui.
2. **Migrar dados** (se preciso): backfill idempotente.
3. **Contract** (release N+1, depois que nenhuma cor antiga usa mais o campo
   velho): remove coluna/constraint obsoleta.

Anti-padrões num único deploy: `DROP COLUMN`, `RENAME`, `NOT NULL` sem default,
mudança de tipo incompatível — qualquer um derruba a cor antiga durante o switch.

---

## Staging (push `develop`)

Recreate simples: o workflow publica as imagens no GHCR e chama
`deploy-color.sh blue <sha>`, que faz `pull` do artefato da cor `blue`
(cor única em staging, sem switch de tráfego), roda migrations e faz o
health-check. Sem blue-green — staging tolera o blip.

---

## Dev / local

[`./deploy.sh`](../../deploy.sh) (compose raiz, single color) continua sendo o
caminho local. O sistema blue-green é específico de produção na VPS.
