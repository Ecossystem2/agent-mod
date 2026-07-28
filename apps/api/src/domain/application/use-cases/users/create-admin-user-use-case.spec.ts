import { FakeAuthProvider } from '@test/providers/fake-auth-provider'
import { InMemoryCacheRepository } from '@test/repositories/in-memory-cache-repository'
import { InMemoryUserRoleAssignmentRepository } from '@test/repositories/in-memory-user-role-assignment-repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EmailAlreadyInUseError } from '../errors/email-already-in-use-error'

import { CreateAdminUserUseCase } from './create-admin-user-use-case'

import { UnexpectedError } from '@/core/errors/unexpected-error'

describe(CreateAdminUserUseCase.name, () => {
  let authProvider: FakeAuthProvider
  let assignmentRepo: InMemoryUserRoleAssignmentRepository
  let cache: InMemoryCacheRepository
  let sut: CreateAdminUserUseCase

  beforeEach(() => {
    authProvider = new FakeAuthProvider()
    assignmentRepo = new InMemoryUserRoleAssignmentRepository()
    cache = new InMemoryCacheRepository()
    sut = new CreateAdminUserUseCase(authProvider, assignmentRepo, cache)
  })

  it('cria usuário com sucesso', async () => {
    const result = await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.email).toBe('ada@example.com')
      expect(result.value.user.name).toBe('Ada Lovelace')
    }
  })

  it('atribui roles ao criar usuário', async () => {
    const result = await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      roleIds: ['role-admin', 'role-gestor'],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const roleIds = await assignmentRepo.findRoleIdsByUserId(result.value.user.id.toString())
      expect(roleIds).toEqual(expect.arrayContaining(['role-admin', 'role-gestor']))
    }
  })

  it('não atribui roles quando roleIds está vazio', async () => {
    const result = await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      roleIds: [],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const roleIds = await assignmentRepo.findRoleIdsByUserId(result.value.user.id.toString())
      expect(roleIds).toEqual([])
    }
  })

  it('não atribui roles quando roleIds não informado', async () => {
    const result = await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const roleIds = await assignmentRepo.findRoleIdsByUserId(result.value.user.id.toString())
      expect(roleIds).toEqual([])
    }
  })

  it('retorna EmailAlreadyInUseError quando email já está em uso', async () => {
    await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      actorUserId: 'actor-1',
    })

    const result = await sut.execute({
      name: 'Outro',
      email: 'ada@example.com',
      password: 'outrasenha',
      actorUserId: 'actor-2',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(EmailAlreadyInUseError)
  })

  it('não persiste roles quando email está duplicado', async () => {
    await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      actorUserId: 'actor-1',
    })

    await sut.execute({
      name: 'Outro',
      email: 'ada@example.com',
      password: 'outrasenha',
      roleIds: ['role-admin'],
      actorUserId: 'actor-2',
    })

    expect(authProvider.users).toHaveLength(1)
  })

  it('grava auditoria após criar usuário', async () => {
    const result = await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(assignmentRepo.auditEvents).toHaveLength(1)
    expect(assignmentRepo.auditEvents[0].action).toBe('user.create')
    expect(assignmentRepo.auditEvents[0].actorUserId).toBe('actor-1')
  })

  it('retorna UnexpectedError e compensa removendo o usuário órfão quando replaceAll falha', async () => {
    assignmentRepo.shouldFailOnReplaceAll = true

    const result = await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
    expect(assignmentRepo.auditEvents).toHaveLength(0)
    expect(authProvider.users).toHaveLength(0)

    // compensação libera o email → recriação com o mesmo email volta a funcionar
    assignmentRepo.shouldFailOnReplaceAll = false
    const retry = await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      actorUserId: 'actor-1',
    })
    expect(retry.isRight()).toBe(true)
  })

  it('invalida o cache de permissões do novo usuário', async () => {
    const result = await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(cache.deletedKeys).toContain(`permissions:user:${result.value.user.id.toString()}`)
    }
  })

  it('mantém UnexpectedError e deixa o órfão quando a própria compensação falha', async () => {
    assignmentRepo.shouldFailOnReplaceAll = true
    vi.spyOn(authProvider, 'deleteUser').mockRejectedValue(new Error('db down'))

    const result = await sut.execute({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'senha123',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
    expect(authProvider.users).toHaveLength(1)
  })
})
