import { makeRole } from '@test/factories'
import { InMemoryCacheRepository } from '@test/repositories/in-memory-cache-repository'
import { InMemoryRoleRepository } from '@test/repositories/in-memory-role-repository'
import { beforeEach, describe, expect, it } from 'vitest'

import { RoleInUseError } from '../errors/role-in-use-error'
import { RoleIsSystemError } from '../errors/role-is-system-error'
import { RoleNotFoundError } from '../errors/role-not-found-error'

import { DeleteRoleUseCase } from './delete-role-use-case'

import { UnexpectedError } from '@/core/errors/unexpected-error'
import { PERMISSIONS_CACHE_PATTERN } from '@/domain/application/cache/permissions-cache'

describe(DeleteRoleUseCase.name, () => {
  let roleRepo: InMemoryRoleRepository
  let cache: InMemoryCacheRepository
  let sut: DeleteRoleUseCase

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository()
    cache = new InMemoryCacheRepository()
    sut = new DeleteRoleUseCase(roleRepo, cache)
  })

  it('retorna RoleNotFoundError quando role não existe', async () => {
    const result = await sut.execute({ roleId: 'inexistente', actorUserId: 'actor-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(RoleNotFoundError)
  })

  it('retorna RoleIsSystemError para role de sistema', async () => {
    const role = makeRole({ isSystem: true, id: 'role-sys' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({ roleId: 'role-sys', actorUserId: 'actor-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(RoleIsSystemError)
  })

  it('retorna RoleInUseError quando há usuários atribuídos', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })
    roleRepo._assignmentCounts.set('role-1', 3)

    const result = await sut.execute({ roleId: 'role-1', actorUserId: 'actor-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(RoleInUseError)
    if (result.isLeft() && result.value instanceof RoleInUseError) {
      expect(result.value.message).toContain('3')
    }
  })

  it('deleta role com sucesso quando não há usuários', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({ roleId: 'role-1', actorUserId: 'actor-1' })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()
    expect(roleRepo.roles).toHaveLength(0)
  })

  it('não remove role de sistema mesmo sem usuários', async () => {
    const role = makeRole({ isSystem: true, id: 'role-sys' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    await sut.execute({ roleId: 'role-sys', actorUserId: 'actor-1' })

    expect(roleRepo.roles).toHaveLength(1)
  })

  it('grava auditoria após deletar role', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })
    roleRepo.auditEvents = []

    const result = await sut.execute({ roleId: 'role-1', actorUserId: 'actor-1' })

    expect(result.isRight()).toBe(true)
    expect(roleRepo.auditEvents).toHaveLength(1)
    expect(roleRepo.auditEvents[0].action).toBe('role.delete')
    expect(roleRepo.auditEvents[0].actorUserId).toBe('actor-1')
  })

  it('falha na operação inteira quando o repositório lança erro (atomicidade)', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })
    roleRepo.auditEvents = []
    roleRepo.shouldFailOnDelete = true

    const result = await sut.execute({ roleId: 'role-1', actorUserId: 'actor-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
    expect(roleRepo.roles).toHaveLength(1)
    expect(roleRepo.auditEvents).toHaveLength(0)
  })

  it('invalida o cache de permissões após deletar role', async () => {
    const role = makeRole({ id: 'role-1' })
    await roleRepo.save(role, { actorUserId: 'seed', action: 'role.create', resourceType: 'role' })

    const result = await sut.execute({ roleId: 'role-1', actorUserId: 'actor-1' })

    expect(result.isRight()).toBe(true)
    expect(cache.invalidatedPatterns).toContain(PERMISSIONS_CACHE_PATTERN)
  })
})
