import { describe, expect, it } from 'vitest'

import { ValueObject } from './value-object'

interface FakeProps {
  a: string
  b: number
}

class FakeVO extends ValueObject<FakeProps> {
  static create(props: FakeProps) {
    return new FakeVO(props)
  }
}

describe('ValueObject', () => {
  it('equals retorna false para null', () => {
    const sut = FakeVO.create({ a: 'x', b: 1 })

    expect(sut.equals(null)).toBe(false)
  })

  it('equals retorna false para undefined', () => {
    const sut = FakeVO.create({ a: 'x', b: 1 })

    expect(sut.equals(undefined)).toBe(false)
  })

  it('equals retorna false quando props do outro VO são undefined', () => {
    const sut = FakeVO.create({ a: 'x', b: 1 })
    const other = { props: undefined } as unknown as FakeVO

    expect(sut.equals(other)).toBe(false)
  })

  it('equals retorna true para props iguais', () => {
    const a = FakeVO.create({ a: 'x', b: 1 })
    const b = FakeVO.create({ a: 'x', b: 1 })

    expect(a.equals(b)).toBe(true)
  })

  it('equals retorna false para props diferentes', () => {
    const a = FakeVO.create({ a: 'x', b: 1 })
    const b = FakeVO.create({ a: 'x', b: 2 })

    expect(a.equals(b)).toBe(false)
  })
})
