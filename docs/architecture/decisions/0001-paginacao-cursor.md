# 0001 — Paginação por cursor (keyset) em listas administrativas

**Data:** 2026-06-19
**Status:** accepted

## Contexto

As listas administrativas (`GET /api/admin/users`, `GET /api/admin/roles`) começaram com paginação por OFFSET (`page`/`perPage` + `take`/`skip` + `COUNT`). Em tabelas que crescem indefinidamente (usuários, papéis, e por extensão qualquer log/coleção de produto), OFFSET tem dois problemas conhecidos:

- **Custo crescente:** `OFFSET N` faz o Postgres varrer e descartar N linhas antes de retornar a página. Quanto mais fundo o usuário pagina, mais lenta a query.
- **Inconsistência sob escrita concorrente:** se uma linha é inserida/removida entre duas requisições de página, registros pulam ou se repetem entre páginas (page drift).

A campanha de hardening (auditoria → 10/10 nas 6 dimensões) exigiu corrigir isso nas listas que crescem.

## Decisão

Adotar **paginação por cursor (keyset)** nas listas administrativas, mantendo a infraestrutura OFFSET (`PaginationParams`/`PaginatedResult`) disponível em `core/repositories/pagination-params.ts` para listas pequenas/limitadas.

**Contrato HTTP:**

- Query: `cursor?: string` (id do último item da página anterior) + `limit?: number` (1..100, default 20).
- Response: `{ users | roles: [...], nextCursor: string | null }`.
- `nextCursor === null` indica fim da coleção.

**Implementação:**

- Ordenação `id desc`; `id` é a única coluna do cursor por ser PK única e estável (tie-breaker trivial, sem necessidade de coluna secundária).
- Slice via `where id < cursor`, `take limit`.
- Tipos canônicos: `CursorPaginationParams`, `CursorPaginatedResult<T>`, `DEFAULT_CURSOR_LIMIT`, `MAX_CURSOR_LIMIT`, `normalizeCursorLimit()` em `core/repositories/pagination-params.ts`.
- Validação do `limit` no controller via `z.coerce.number().int().min(1).max(100).default(20)`.

**Padrão front:** `useInfiniteQuery` do TanStack Query + botão "Carregar mais". `getNextPageParam: (last) => last.nextCursor ?? undefined`; `initialPageParam: undefined`.

## Alternativas consideradas

- **OFFSET (`page`/`perPage`)** — descartada para listas que crescem pelos motivos acima. Mantida na base de código para listas com teto conhecido (onde navegação por número de página agrega e o custo é irrelevante).
- **Cursor composto (coluna + id)** — desnecessário aqui: a ordenação é por `id desc` e a PK já é única e monotônica o bastante para o caso. Quando uma lista precisar ordenar por outra coluna não-única (ex: `createdAt`), o cursor deve passar a ser composto `(coluna, id)`.

## Consequências

- **Positivas:** custo de query constante independente da profundidade; sem page drift sob escrita concorrente; contrato simples (`cursor` + `limit`).
- **Negativas:** não permite saltar para uma página arbitrária (ex: "ir para página 7") — só avança sequencialmente. Não expõe total de registros (sem `COUNT`).
- **Riscos:** se uma lista futura ordenar por coluna não-única e reusar este contrato sem cursor composto, pode pular/repetir itens em empates. Documentar o cursor composto quando esse caso aparecer.

## Referências

- `apps/api/src/core/repositories/pagination-params.ts`
- `apps/api/src/domain/application/use-cases/users/list-users-use-case.ts`
- `apps/api/src/domain/application/use-cases/roles/list-roles-use-case.ts`
- `apps/api/src/infra/http/controllers/admin/users.controller.ts`
- `apps/web/src/features/admin/api/users-api.ts`
- [Paginação](../pagination.md)
