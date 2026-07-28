import { describe, expect, it } from 'vitest'

import { type Either, Left, Right, left, right } from './either'

describe('Either', () => {
  it('left() cria um Left e responde isLeft/isRight', () => {
    const sut: Either<string, number> = left('erro')

    expect(sut).toBeInstanceOf(Left)
    expect(sut.value).toBe('erro')
    expect(sut.isLeft()).toBe(true)
    expect(sut.isRight()).toBe(false)
  })

  it('right() cria um Right e responde isLeft/isRight', () => {
    const sut: Either<string, number> = right(42)

    expect(sut).toBeInstanceOf(Right)
    expect(sut.value).toBe(42)
    expect(sut.isLeft()).toBe(false)
    expect(sut.isRight()).toBe(true)
  })
})
