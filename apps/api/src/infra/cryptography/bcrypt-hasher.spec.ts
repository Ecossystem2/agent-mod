import { describe, expect, it } from 'vitest'

import { BcryptHasher } from './bcrypt-hasher'

describe('BcryptHasher', () => {
  it('gera um hash diferente do plaintext', async () => {
    const sut = new BcryptHasher()

    const hashed = await sut.hash('my-password')

    expect(hashed).not.toBe('my-password')
    expect(hashed.length).toBeGreaterThan(0)
  })

  it('compare retorna true para o hash correspondente', async () => {
    const sut = new BcryptHasher()
    const hashed = await sut.hash('my-password')

    await expect(sut.compare('my-password', hashed)).resolves.toBe(true)
  })

  it('compare retorna false para senha errada', async () => {
    const sut = new BcryptHasher()
    const hashed = await sut.hash('my-password')

    await expect(sut.compare('wrong', hashed)).resolves.toBe(false)
  })
})
