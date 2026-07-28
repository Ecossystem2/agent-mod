import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  buildPaginatedResult,
  normalizePagination,
} from './pagination-params'

describe('normalizePagination', () => {
  it('aplica defaults quando perPage não é fornecido', () => {
    const sut = normalizePagination({ page: 1 })

    expect(sut).toEqual({ page: 1, perPage: DEFAULT_PER_PAGE })
  })

  it('faz clamp de page para no mínimo 1', () => {
    expect(normalizePagination({ page: 0 }).page).toBe(1)
    expect(normalizePagination({ page: -5 }).page).toBe(1)
  })

  it('faz floor de page fracionário', () => {
    expect(normalizePagination({ page: 2.9 }).page).toBe(2)
  })

  it('faz clamp de perPage entre 1 e MAX_PER_PAGE', () => {
    expect(normalizePagination({ page: 1, perPage: 0 }).perPage).toBe(1)
    expect(normalizePagination({ page: 1, perPage: 999 }).perPage).toBe(MAX_PER_PAGE)
  })
})

describe('buildPaginatedResult', () => {
  it('calcula totalPages com ceil', () => {
    const sut = buildPaginatedResult([1, 2], 21, { page: 1, perPage: 10 })

    expect(sut).toEqual({
      items: [1, 2],
      total: 21,
      page: 1,
      perPage: 10,
      totalPages: 3,
    })
  })

  it('garante no mínimo 1 página quando total é 0', () => {
    const sut = buildPaginatedResult([], 0, { page: 1, perPage: 10 })

    expect(sut.totalPages).toBe(1)
  })
})
