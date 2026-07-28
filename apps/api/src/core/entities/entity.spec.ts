import { describe, expect, it } from 'vitest'

import { Entity } from './entity'
import { UniqueEntityID } from './unique-entity-id'

interface FakeProps {
  value: string
}

class FakeEntity extends Entity<FakeProps> {
  static create(props: FakeProps, id?: UniqueEntityID) {
    return new FakeEntity(props, id)
  }
}

describe('Entity', () => {
  it('gera um id quando nenhum é fornecido', () => {
    const sut = FakeEntity.create({ value: 'x' })

    expect(sut.id).toBeInstanceOf(UniqueEntityID)
  })

  it('usa o id fornecido', () => {
    const id = new UniqueEntityID('fixed')
    const sut = FakeEntity.create({ value: 'x' }, id)

    expect(sut.id).toBe(id)
  })

  it('equals retorna true para a mesma referência', () => {
    const sut = FakeEntity.create({ value: 'x' })

    expect(sut.equals(sut)).toBe(true)
  })

  it('equals retorna true quando o id (mesma referência) é compartilhado', () => {
    const id = new UniqueEntityID('shared')
    const a = FakeEntity.create({ value: 'a' }, id)
    const b = FakeEntity.create({ value: 'b' }, id)

    expect(a.equals(b)).toBe(true)
  })

  it('equals retorna true para mesmo UUID lógico em instâncias distintas de UniqueEntityID', () => {
    const a = FakeEntity.create({ value: 'a' }, new UniqueEntityID('same-uuid'))
    const b = FakeEntity.create({ value: 'b' }, new UniqueEntityID('same-uuid'))

    expect(a.equals(b)).toBe(true)
  })

  it('equals retorna false para entidades distintas', () => {
    const a = FakeEntity.create({ value: 'a' }, new UniqueEntityID('a'))
    const b = FakeEntity.create({ value: 'b' }, new UniqueEntityID('b'))

    expect(a.equals(b)).toBe(false)
  })
})
