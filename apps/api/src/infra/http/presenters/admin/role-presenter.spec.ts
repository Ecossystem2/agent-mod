import { makeRole } from '@test/factories'
import { describe, expect, it } from 'vitest'

import { RolePresenter } from './role-presenter'

describe(RolePresenter.name, () => {
  it('mapeia todos os campos corretamente', () => {
    const role = makeRole({
      name: 'Gestor',
      description: 'Gerencia usuários',
      permissions: ['admin:users', 'view:dashboard'],
    })
    const sut = RolePresenter.toHTTP(role, 5)

    expect(sut.id).toBe('role-1')
    expect(sut.name).toBe('Gestor')
    expect(sut.description).toBe('Gerencia usuários')
    expect(sut.isSystem).toBe(false)
    expect(sut.permissions).toEqual(['admin:users', 'view:dashboard'])
    expect(sut.assignedUserCount).toBe(5)
    expect(sut.createdAt).toEqual(new Date('2024-01-01'))
  })

  it('mapeia description null', () => {
    const role = makeRole({ description: null })
    const sut = RolePresenter.toHTTP(role, 0)

    expect(sut.description).toBeNull()
  })

  it('mapeia assignedUserCount zero', () => {
    const role = makeRole()
    const sut = RolePresenter.toHTTP(role, 0)

    expect(sut.assignedUserCount).toBe(0)
  })

  it('mapeia isSystem true', () => {
    const role = makeRole({ isSystem: true })
    const sut = RolePresenter.toHTTP(role, 2)

    expect(sut.isSystem).toBe(true)
  })

  it('mapeia permissions vazia', () => {
    const role = makeRole({ permissions: [] })
    const sut = RolePresenter.toHTTP(role, 0)

    expect(sut.permissions).toEqual([])
  })
})
