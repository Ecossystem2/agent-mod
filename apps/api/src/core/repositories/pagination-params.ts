export interface PaginationParams {
  page: number
  perPage?: number
}

// Keyset (cursor) pagination: ordena por `id desc` e fatia com `where id < cursor`.
// `id` é a única coluna usada no cursor por ser PK única e estável (tie-breaker trivial).
export interface CursorPaginationParams {
  cursor?: string
  limit?: number
}

export interface CursorPaginatedResult<T> {
  items: T[]
  nextCursor: string | null
}

export const DEFAULT_CURSOR_LIMIT = 20
export const MAX_CURSOR_LIMIT = 100

export function normalizeCursorLimit(limit?: number): number {
  if (limit === undefined) return DEFAULT_CURSOR_LIMIT
  return Math.min(MAX_CURSOR_LIMIT, Math.max(1, Math.floor(limit)))
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export const DEFAULT_PER_PAGE = 20
export const MAX_PER_PAGE = 100

export function normalizePagination(params: PaginationParams): Required<PaginationParams> {
  const page = Math.max(1, Math.floor(params.page))
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, params.perPage ?? DEFAULT_PER_PAGE))
  return { page, perPage }
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  params: Required<PaginationParams>,
): PaginatedResult<T> {
  return {
    items,
    total,
    page: params.page,
    perPage: params.perPage,
    totalPages: Math.max(1, Math.ceil(total / params.perPage)),
  }
}
