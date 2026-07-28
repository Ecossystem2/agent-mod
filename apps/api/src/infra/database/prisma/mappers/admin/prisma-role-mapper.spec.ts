import { describe, expect, it } from 'vitest'

import { PrismaRoleMapper } from './prisma-role-mapper'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Role } from '@/domain/enterprise/entities/role'


describe(PrismaRoleMapper.name, () => {
  const baseDate = new Date('2024-01-01T00:00:00.000Z')

  const rawRole = {
    id: 'role-1',
    name: 'admin',
    description: 'Administrador',
    isSystem: false,
    createdAt: baseDate,
    updatedAt: baseDate,
    permissions: [
      { id: 'perm-1', roleId: 'role-1', permission: 'users:read' },
      { id: 'perm-2', roleId: 'role-1', permission: 'users:write' },
    ],
  }

  describe('toDomain', () => {
    it('converte corretamente para entidade de domínio', () => {
      const sut = PrismaRoleMapper.toDomain(rawRole)

      expect(sut).toBeInstanceOf(Role)
      expect(sut.id.toString()).toBe('role-1')
      expect(sut.name).toBe('admin')
      expect(sut.description).toBe('Administrador')
      expect(sut.isSystem).toBe(false)
      expect(sut.createdAt).toEqual(baseDate)
      expect(sut.updatedAt).toEqual(baseDate)
    })

    it('mapeia permissões corretamente', () => {
      const sut = PrismaRoleMapper.toDomain(rawRole)

      expect(sut.permissions).toEqual(['users:read', 'users:write'])
    })

    it('aceita description nula', () => {
      const sut = PrismaRoleMapper.toDomain({ ...rawRole, description: null })

      expect(sut.description).toBeNull()
    })

    it('aceita lista de permissões vazia', () => {
      const sut = PrismaRoleMapper.toDomain({ ...rawRole, permissions: [] })

      expect(sut.permissions).toEqual([])
    })

    it('preserva o id ao criar a entidade', () => {
      const sut = PrismaRoleMapper.toDomain(rawRole)

      expect(sut.id).toEqual(new UniqueEntityID('role-1'))
    })
  })

  describe('toPrismaCreate', () => {
    it('retorna estrutura correta para criação', () => {
      const role = Role.create(
        {
          name: 'editor',
          description: 'Editor de conteúdo',
          isSystem: false,
          permissions: ['posts:read', 'posts:write'],
          createdAt: baseDate,
          updatedAt: baseDate,
        },
        new UniqueEntityID('role-2'),
      )

      const sut = PrismaRoleMapper.toPrismaCreate(role)

      expect(sut.id).toBe('role-2')
      expect(sut.name).toBe('editor')
      expect(sut.description).toBe('Editor de conteúdo')
      expect(sut.isSystem).toBe(false)
      expect(sut.permissions).toEqual({
        create: [{ permission: 'posts:read' }, { permission: 'posts:write' }],
      })
    })

    it('retorna permissions.create vazio quando sem permissões', () => {
      const role = Role.create(
        {
          name: 'viewer',
          description: null,
          isSystem: false,
          permissions: [],
          createdAt: baseDate,
          updatedAt: baseDate,
        },
        new UniqueEntityID('role-3'),
      )

      const sut = PrismaRoleMapper.toPrismaCreate(role)

      expect(sut.permissions).toEqual({ create: [] })
    })
  })
})
