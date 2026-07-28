import { describe, expect, it, vi } from 'vitest'

import { AuthService } from './auth.service'

import type { AppAuth } from './auth'

describe('AuthService', () => {
  it('expõe a instância e a api do better-auth', () => {
    const api = { getSession: vi.fn() }
    const auth = { api } as unknown as AppAuth
    const sut = new AuthService(auth)

    expect(sut.instance).toBe(auth)
    expect(sut.api).toBe(api)
  })

  it('getSession delega para auth.api.getSession com os headers', async () => {
    const session = { user: { id: 'u1' } }
    const getSession = vi.fn().mockResolvedValue(session)
    const auth = { api: { getSession } } as unknown as AppAuth
    const sut = new AuthService(auth)
    const headers = new Headers()

    await expect(sut.getSession(headers)).resolves.toBe(session)
    expect(getSession).toHaveBeenCalledWith({ headers })
  })
})
