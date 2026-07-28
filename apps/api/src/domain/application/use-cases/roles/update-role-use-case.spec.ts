import { makeRole } from '@test/factories'
import { InMemoryCacheRepository } from '@test/repositories/in-memory-cache-repository'
import { InMemoryRoleRepository } from '@test/repositories/in-memory-role-repository'
import { beforeEach, describe, expect, it } from 'vitest'

import { RoleIsSystemError } from '../errors/role-is-system-error'
import { RoleNameTakenError } from '../errors/role-name-taken-error'
import { RoleNotFoundError } from '../errors/role-not-found-error'

import { UpdateRoleUseCase } from './update-role-use-case'

import { UnexpectedError } from '@/core/errors/unexpected-error'
import { PERMISSIONS_CACHE_PATTERN } from '@/domain/application/cache/permissions-cache'

describe(UpdateRoleUseCase.name, () => {
  let roleRepo: InMemoryRoleRepository
  let cache: InMemoryCacheRepository
  let sut: UpdateRoleUseCase

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository()
    cache = new InMemoryCacheRepository()
    sut = new UpdateRoleUseCase(roleRepo, cache)
  })

  it('retorna RoleNotFoundError quando role não existe', async () => {
    const result = await sut.execute({
      roleId: 'inexistente',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(RoleNotFoundError)
  })

  it('retorna RoleIsSystemError para role de sistema', async () => {
    const role = makeRole({ isSystem: true, id: 'role-sys' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({
      roleId: 'role-sys',
      name: 'Novo Nome',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(RoleIsSystemError)
  })

  it('atualiza nome com sucesso', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({
      roleId: 'role-1',
      name: 'Supervisor',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.role.name).toBe('Supervisor')
    }
  })

  it('não altera nome quando mesmo nome é passado', async () => {
    const role = makeRole({ name: 'Gestor', id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({
      roleId: 'role-1',
      name: 'Gestor',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(roleRepo.roles[0].name).toBe('Gestor')
  })

  it('retorna RoleNameTakenError quando novo nome já existe em outro cargo', async () => {
    const role1 = makeRole({ name: 'Gestor', id: 'role-1' })
    const role2 = makeRole({ name: 'Supervisor', id: 'role-2' })
    await roleRepo.save(role1, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })
    await roleRepo.save(role2, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({
      roleId: 'role-1',
      name: 'Supervisor',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(RoleNameTakenError)
  })

  it('atualiza description com sucesso', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({
      roleId: 'role-1',
      description: 'Nova descrição',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.role.description).toBe('Nova descrição')
    }
  })

  it('atualiza description para null', async () => {
    const role = makeRole({ description: 'Antiga', id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({
      roleId: 'role-1',
      description: null,
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.role.description).toBeNull()
    }
  })

  it('atualiza permissões com sucesso', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({
      roleId: 'role-1',
      permissions: ['admin:users', 'admin:roles'],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.role.permissions).toEqual(['admin:users', 'admin:roles'])
    }
  })

  it('persiste as alterações no repositório', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    await sut.execute({
      roleId: 'role-1',
      name: 'Atualizado',
      actorUserId: 'actor-1',
    })

    expect(roleRepo.roles[0].name).toBe('Atualizado')
  })

  it('grava auditoria após atualizar role', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })
    roleRepo.auditEvents = []

    const result = await sut.execute({
      roleId: 'role-1',
      name: 'Novo Nome',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(roleRepo.auditEvents).toHaveLength(1)
    expect(roleRepo.auditEvents[0].action).toBe('role.update')
    expect(roleRepo.auditEvents[0].actorUserId).toBe('actor-1')
  })

  it('falha na operação inteira quando o repositório lança erro (atomicidade)', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })
    roleRepo.auditEvents = []
    roleRepo.shouldFailOnSave = true

    const result = await sut.execute({ roleId: 'role-1', name: 'Novo Nome', actorUserId: 'actor-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
    expect(roleRepo.auditEvents).toHaveLength(0)
  })

  it('invalida o cache de permissões após atualizar role', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({
      roleId: 'role-1',
      permissions: ['admin:users'],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(cache.invalidatedPatterns).toContain(PERMISSIONS_CACHE_PATTERN)
  })
})
