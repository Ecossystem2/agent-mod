# Paginação

Duas estratégias coexistem. Escolha pela natureza da lista.

## Cursor (keyset) — listas que crescem

Padrão para coleções sem teto (usuários, papéis, logs). Custo de query constante, sem page drift sob escrita concorrente. Ver [ADR 0001](decisions/0001-paginacao-cursor.md).

**Contrato HTTP:**

| Direção | Campo | Regra |
|---|---|---|
| Query | `cursor?: string` | id do último item da página anterior. Ausente = primeira página |
| Query | `limit?: number` | 1..100, default 20 |
| Response | `{ <items>: [...], nextCursor: string \| null }` | `nextCursor === null` = fim |

**Implementação:** ordenação `id desc`, slice `where id < cursor` + `take limit`. `id` (PK cuid) é a única coluna do cursor — única e estável. Tipos em `core/repositories/pagination-params.ts`: `CursorPaginationParams`, `CursorPaginatedResult<T>`, `normalizeCursorLimit()`, `DEFAULT_CURSOR_LIMIT` (20), `MAX_CURSOR_LIMIT` (100).

Endpoints atuais: `GET /api/admin/users`, `GET /api/admin/roles`.

**Trade-off:** não navega para página arbitrária e não retorna total. Se uma lista precisar ordenar por coluna não-única (ex: `createdAt`), migrar para cursor composto `(coluna, id)`.

**Front:** `useInfiniteQuery` + "Carregar mais".

```ts
useInfiniteQuery({
  queryKey: ['admin', 'users', { limit }],
  queryFn: ({ pageParam }) => api.get('/api/admin/users', { params: { cursor: pageParam, limit } }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
})
```

## Offset (`page`/`perPage`) — listas com teto conhecido

Mantido em `core/repositories/pagination-params.ts` (`PaginationParams`, `PaginatedResult`, `normalizePagination`, `buildPaginatedResult`) para listas pequenas onde navegação por número de página agrega e o `COUNT` é barato. Não usar em tabela que cresce indefinidamente.
