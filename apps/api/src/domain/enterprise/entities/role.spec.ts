import { describe, expect, it } from 'vitest'

import { Role, type RoleProps } from './role'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'

function makeRoleProps(override: Partial<RoleProps> = {}): RoleProps {
  return {
    name: 'Gestor',
    description: 'Gerencia usuários',
    isSystem: false,
    permissions: ['view:dashboard'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    ...override,
  }
}

describe('Role', () => {
  it('cria com id gerado e expõe todos os getters', () => {
    const props = makeRoleProps()
    const sut = Role.create(props)

    expect(sut.id).toBeInstanceOf(UniqueEntityID)
    expect(sut.name).toBe(props.name)
    expect(sut.description).toBe(props.description)
    expect(sut.isSystem).toBe(false)
    expect(sut.permissions).toEqual(props.permissions)
    expect(sut.createdAt).toBe(props.createdAt)
    expect(sut.updatedAt).toBe(props.updatedAt)
  })

  it('aceita id explícito', () => {
    const id = new UniqueEntityID('role-1')
    const sut = Role.create(makeRoleProps(), id)

    expect(sut.id).toBe(id)
  })

  it('aceita description nula', () => {
    const sut = Role.create(makeRoleProps({ description: null }))

    expect(sut.description).toBeNull()
  })

  it('create guarda cópia defensiva de permissions — mutar a origem não afeta a role', () => {
    const entrada = ['view:dashboard']
    const sut = Role.create(makeRoleProps({ permissions: entrada }))

    entrada.push('admin:users')

    expect(sut.permissions).toEqual(['view:dashboard'])
  })

  describe('setPermissions', () => {
    it('atualiza permissões em role normal', () => {
      const sut = Role.create(makeRoleProps())
      const novasPermissoes = ['admin:users', 'view:dashboard']

      sut.setPermissions(novasPermissoes)

      expect(sut.permissions).toEqual(novasPermissoes)
    })

    it('guarda cópia defensiva — mutar o array de origem não afeta a role', () => {
      const sut = Role.create(makeRoleProps())
      const entrada = ['admin:users']

      sut.setPermissions(entrada)
      entrada.push('admin:roles')

      expect(sut.permissions).toEqual(['admin:users'])
    })

    it('atualiza updatedAt ao setar permissões', () => {
      const sut = Role.create(makeRoleProps())
      const antes = sut.updatedAt

      sut.setPermissions(['admin:roles'])

      expect(sut.updatedAt.getTime()).toBeGreaterThanOrEqual(antes.getTime())
    })

  })

  describe('updateName', () => {
    it('atualiza nome', () => {
      const sut = Role.create(makeRoleProps())

      sut.updateName('Supervisor')

      expect(sut.name).toBe('Supervisor')
    })

    it('atualiza updatedAt ao renomear', () => {
      const sut = Role.create(makeRoleProps())
      const antes = sut.updatedAt

      sut.updateName('Supervisor')

      expect(sut.updatedAt.getTime()).toBeGreaterThanOrEqual(antes.getTime())
    })

  })

  describe('updateDescription', () => {
    it('atualiza descrição', () => {
      const sut = Role.create(makeRoleProps())

      sut.updateDescription('Nova descrição')

      expect(sut.description).toBe('Nova descrição')
    })

    it('aceita null como descrição', () => {
      const sut = Role.create(makeRoleProps({ description: 'Antiga' }))

      sut.updateDescription(null)

      expect(sut.description).toBeNull()
    })

    it('atualiza updatedAt ao alterar descrição', () => {
      const sut = Role.create(makeRoleProps())
      const antes = sut.updatedAt

      sut.updateDescription('Nova')

      expect(sut.updatedAt.getTime()).toBeGreaterThanOrEqual(antes.getTime())
    })

  })

  it('não acumula eventos de domínio (sem evento de permissões)', () => {
    const sut = Role.create(makeRoleProps())

    sut.setPermissions(['admin:users'])

    expect(sut.domainEvents).toHaveLength(0)
  })
})
