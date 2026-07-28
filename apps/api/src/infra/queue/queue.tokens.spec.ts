import { describe, expect, it } from 'vitest'

import { queueToken } from './queue.tokens'

describe('queueToken', () => {
  it('cria um símbolo global a partir do nome', () => {
    expect(queueToken('emails')).toBe(Symbol.for('Queue:emails'))
  })

  it('retorna o mesmo símbolo para o mesmo nome', () => {
    expect(queueToken('emails')).toBe(queueToken('emails'))
  })

  it('retorna símbolos distintos para nomes diferentes', () => {
    expect(queueToken('a')).not.toBe(queueToken('b'))
  })
})
