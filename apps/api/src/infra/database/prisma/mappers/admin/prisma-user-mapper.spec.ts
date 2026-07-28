import { describe, expect, it } from 'vitest'

import { PrismaUserMapper } from './prisma-user-mapper'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { User } from '@/domain/enterprise/entities/user'


describe(PrismaUserMapper.name, () => {
  const baseDate = new Date('2024-01-01T00:00:00.000Z')

  const rawUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    emailVerified: true,
    image: 'https://example.com/avatar.png',
    createdAt: baseDate,
    updatedAt: baseDate,
  }

  describe('toDomain', () => {
    it('converte corretamente para entidade de domínio sem roleIds', () => {
      const sut = PrismaUserMapper.toDomain(rawUser)

      expect(sut).toBeInstanceOf(User)
      expect(sut.id.toString()).toBe('user-1')
      expect(sut.name).toBe('John Doe')
      expect(sut.email).toBe('john@example.com')
      expect(sut.emailVerified).toBe(true)
      expect(sut.image).toBe('https://example.com/avatar.png')
      expect(sut.roleIds).toEqual([])
      expect(sut.createdAt).toEqual(baseDate)
      expect(sut.updatedAt).toEqual(baseDate)
    })

    it('converte corretamente para entidade de domínio com roleIds', () => {
      const roleIds = ['role-1', 'role-2']

      const sut = PrismaUserMapper.toDomain(rawUser, roleIds)

      expect(sut.roleIds).toEqual(['role-1', 'role-2'])
    })

    it('aceita image nula', () => {
      const sut = PrismaUserMapper.toDomain({ ...rawUser, image: null })

      expect(sut.image).toBeNull()
    })

    it('preserva o id ao criar a entidade', () => {
      const sut = PrismaUserMapper.toDomain(rawUser)

      expect(sut.id).toEqual(new UniqueEntityID('user-1'))
    })

    it('usa array vazio quando roleIds não é fornecido', () => {
      const sut = PrismaUserMapper.toDomain(rawUser, undefined)

      expect(sut.roleIds).toEqual([])
    })
  })
})
