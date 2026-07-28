import { describe, expect, it } from 'vitest'

import { parseLocalDate, toDateOnly } from './date'

describe('parseLocalDate', () => {
  it('interpreta YYYY-MM-DD no fuso local, sem andar um dia pra trás', () => {
    const sut = parseLocalDate('2026-01-01')

    expect(sut.getFullYear()).toBe(2026)
    expect(sut.getMonth()).toBe(0)
    expect(sut.getDate()).toBe(1)
  })

  it('aceita ISO completo usando apenas a parte da data', () => {
    const sut = parseLocalDate('2026-03-15T00:00:00.000Z')

    expect(sut.getFullYear()).toBe(2026)
    expect(sut.getMonth()).toBe(2)
    expect(sut.getDate()).toBe(15)
  })

  it('rejeita string fora do formato esperado', () => {
    expect(() => parseLocalDate('15/03/2026')).toThrow(/esperado 'YYYY-MM-DD'/)
  })
})

describe('toDateOnly', () => {
  it('serializa usando componentes locais, com zero-padding', () => {
    expect(toDateOnly(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('preserva o dia mesmo perto da meia-noite local', () => {
    expect(toDateOnly(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})

describe('parseLocalDate + toDateOnly', () => {
  it('faz round-trip sem deslocar o dia (o bug reincidente de off-by-one)', () => {
    const original = '2026-01-01'

    expect(toDateOnly(parseLocalDate(original))).toBe(original)
  })
})
