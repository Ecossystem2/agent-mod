import { describe, expect, it } from 'vitest'

import { User, type UserProps } from './user'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'


function makeUserProps(override: Partial<UserProps> = {}): UserProps {
  return {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    emailVerified: true,
    image: 'https://example.com/avatar.png',
    roleIds: ['role-1'],
    isActive: true,
    isProtected: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    ...override,
  }
}

describe('User', () => {
  it('default isActive=true e isProtected=false quando não informados', () => {
    const sut = User.create(makeUserProps())

    expect(sut.isActive).toBe(true)
    expect(sut.isProtected).toBe(false)
  })

  it('aceita isActive=false e isProtected=true explicitamente', () => {
    const sut = User.create(makeUserProps({ isActive: false, isProtected: true }))

    expect(sut.isActive).toBe(false)
    expect(sut.isProtected).toBe(true)
  })

  describe('deactivate()', () => {
    it('define isActive=false em usuário normal', () => {
      const sut = User.create(makeUserProps({ isActive: true, isProtected: false }))

      sut.deactivate()

      expect(sut.isActive).toBe(false)
    })

    it('atualiza updatedAt ao desativar', () => {
      const before = new Date('2024-01-01')
      const sut = User.create(makeUserProps({ isActive: true, isProtected: false, updatedAt: before }))

      sut.deactivate()

      expect(sut.updatedAt.getTime()).toBeGreaterThan(before.getTime())
    })

    it('é idempotente — desativar usuário já inativo define isActive=false sem erro', () => {
      const sut = User.create(makeUserProps({ isActive: false, isProtected: false }))

      sut.deactivate()

      expect(sut.isActive).toBe(false)
    })

    it('desativa usuário protegido sem lançar erro (guard movido para use-case)', () => {
      const sut = User.create(makeUserProps({ isActive: true, isProtected: true }))

      sut.deactivate()

      expect(sut.isActive).toBe(false)
    })
  })

  describe('reactivate()', () => {
    it('define isActive=true em usuário inativo e retorna true', () => {
      const sut = User.create(makeUserProps({ isActive: false }))

      const changed = sut.reactivate()

      expect(sut.isActive).toBe(true)
      expect(changed).toBe(true)
    })

    it('retorna false sem alterar estado quando usuário já está ativo', () => {
      const sut = User.create(makeUserProps({ isActive: true }))

      const changed = sut.reactivate()

      expect(sut.isActive).toBe(true)
      expect(changed).toBe(false)
    })

    it('atualiza updatedAt ao reativar', () => {
      const before = new Date('2024-01-01')
      const sut = User.create(makeUserProps({ isActive: false, updatedAt: before }))

      sut.reactivate()

      expect(sut.updatedAt.getTime()).toBeGreaterThan(before.getTime())
    })

    it('não atualiza updatedAt quando já está ativo', () => {
      const before = new Date('2024-01-01')
      const sut = User.create(makeUserProps({ isActive: true, updatedAt: before }))

      sut.reactivate()

      expect(sut.updatedAt).toBe(before)
    })
  })

  describe('assignRoles()', () => {
    it('substitui os roleIds da entidade', () => {
      const sut = User.create(makeUserProps({ roleIds: ['role-antigo'] }))

      sut.assignRoles(['role-a', 'role-b'])

      expect([...sut.roleIds]).toEqual(['role-a', 'role-b'])
    })

    it('aceita lista vazia removendo todos os roles', () => {
      const sut = User.create(makeUserProps({ roleIds: ['role-1', 'role-2'] }))

      sut.assignRoles([])

      expect(sut.roleIds).toEqual([])
    })

    it('atualiza updatedAt ao reatribuir roles', () => {
      const before = new Date('2024-01-01')
      const sut = User.create(makeUserProps({ roleIds: ['role-1'], updatedAt: before }))

      sut.assignRoles(['role-2'])

      expect(sut.updatedAt.getTime()).toBeGreaterThan(before.getTime())
    })

    it('guarda cópia defensiva — mutar o array de origem não afeta o usuário', () => {
      const sut = User.create(makeUserProps())
      const entrada = ['role-a']

      sut.assignRoles(entrada)
      entrada.push('role-b')

      expect([...sut.roleIds]).toEqual(['role-a'])
    })
  })

  it('cria com id gerado e expõe todos os getters', () => {
    const props = makeUserProps()
    const sut = User.create(props)

    expect(sut.id).toBeInstanceOf(UniqueEntityID)
    expect(sut.name).toBe(props.name)
    expect(sut.email).toBe(props.email)
    expect(sut.emailVerified).toBe(props.emailVerified)
    expect(sut.image).toBe(props.image)
    expect(sut.roleIds).toEqual(props.roleIds)
    expect(sut.createdAt).toBe(props.createdAt)
    expect(sut.updatedAt).toBe(props.updatedAt)
  })

  it('aceita id explícito', () => {
    const id = new UniqueEntityID('user-1')
    const sut = User.create(makeUserProps(), id)

    expect(sut.id).toBe(id)
  })

  it('aceita image nula e roleIds vazio', () => {
    const sut = User.create(makeUserProps({ image: null, roleIds: [] }))

    expect(sut.image).toBeNull()
    expect(sut.roleIds).toEqual([])
  })

  it('aceita múltiplos roleIds', () => {
    const sut = User.create(makeUserProps({ roleIds: ['role-1', 'role-2', 'role-3'] }))

    expect(sut.roleIds).toHaveLength(3)
    expect(sut.roleIds).toContain('role-2')
  })

  it('create guarda cópia defensiva de roleIds — mutar a origem não afeta o usuário', () => {
    const entrada = ['role-1']
    const sut = User.create(makeUserProps({ roleIds: entrada }))

    entrada.push('role-2')

    expect([...sut.roleIds]).toEqual(['role-1'])
  })
})
