import { makeUser } from '@test/factories'
import { describe, expect, it } from 'vitest'

import { UserPresenter } from './user-presenter'

describe(UserPresenter.name, () => {
  it('mapeia todos os campos corretamente', () => {
    const user = makeUser({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roleIds: ['role-1', 'role-2'],
    })
    const sut = UserPresenter.toHTTP(user)

    expect(sut.id).toBe('user-1')
    expect(sut.email).toBe('ada@example.com')
    expect(sut.name).toBe('Ada Lovelace')
    expect(sut.emailVerified).toBe(true)
    expect(sut.roleIds).toEqual(['role-1', 'role-2'])
    expect(sut.createdAt).toEqual(new Date('2024-01-01'))
  })

  it('usa roleIds do user quando não passado explicitamente', () => {
    const user = makeUser({ roleIds: ['role-a', 'role-b'] })
    const sut = UserPresenter.toHTTP(user)

    expect(sut.roleIds).toEqual(['role-a', 'role-b'])
  })

  it('usa roleIds explícito sobrescrevendo o do user', () => {
    const user = makeUser({ roleIds: ['role-old'] })
    const sut = UserPresenter.toHTTP(user, ['role-new-1', 'role-new-2'])

    expect(sut.roleIds).toEqual(['role-new-1', 'role-new-2'])
  })

  it('mapeia roleIds vazio quando não há roles', () => {
    const user = makeUser({ roleIds: [] })
    const sut = UserPresenter.toHTTP(user)

    expect(sut.roleIds).toEqual([])
  })

  it('mapeia emailVerified false', () => {
    const user = makeUser({ emailVerified: false })
    const sut = UserPresenter.toHTTP(user)

    expect(sut.emailVerified).toBe(false)
  })
})
