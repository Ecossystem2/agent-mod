import { InMemoryRoleRepository } from '@test/repositories/in-memory-role-repository'
import { beforeEach, describe, expect, it } from 'vitest'


import { RoleNameTakenError } from '../errors/role-name-taken-error'

import { CreateRoleUseCase } from './create-role-use-case'

import { UnexpectedError } from '@/core/errors/unexpected-error'

describe(CreateRoleUseCase.name, () => {
  let roleRepo: InMemoryRoleRepository
  let sut: CreateRoleUseCase

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository()
    sut = new CreateRoleUseCase(roleRepo)
  })

  it('cria role com sucesso', async () => {
    const result = await sut.execute({
      name: 'Gestor',
      permissions: ['view:dashboard'],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.role.name).toBe('Gestor')
      expect(result.value.role.permissions).toEqual(['view:dashboard'])
      expect(result.value.role.isSystem).toBe(false)
    }
    expect(roleRepo.roles).toHaveLength(1)
  })

  it('cria role sem permissões quando não informadas', async () => {
    const result = await sut.execute({
      name: 'Visualizador',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.role.permissions).toEqual([])
    }
  })

  it('cria role com description', async () => {
    const result = await sut.execute({
      name: 'Gestor',
      description: 'Gerencia usuários',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.role.description).toBe('Gerencia usuários')
    }
  })

  it('cria role com description null quando não informada', async () => {
    const result = await sut.execute({
      name: 'Gestor',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.role.description).toBeNull()
    }
  })

  it('retorna RoleNameTakenError se nome já existe', async () => {
    await sut.execute({ name: 'Gestor', actorUserId: 'actor-1' })

    const result = await sut.execute({ name: 'Gestor', actorUserId: 'actor-2' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(RoleNameTakenError)
  })

  it('não persiste role quando nome é duplicado', async () => {
    await sut.execute({ name: 'Gestor', actorUserId: 'actor-1' })
    await sut.execute({ name: 'Gestor', actorUserId: 'actor-2' })

    expect(roleRepo.roles).toHaveLength(1)
  })

  it('grava auditoria após criar role', async () => {
    const result = await sut.execute({
      name: 'Gestor',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(roleRepo.auditEvents).toHaveLength(1)
    expect(roleRepo.auditEvents[0].action).toBe('role.create')
    expect(roleRepo.auditEvents[0].actorUserId).toBe('actor-1')
  })

  it('retorna UnexpectedError quando o repositório lança erro', async () => {
    roleRepo.shouldFailOnSave = true

    const result = await sut.execute({ name: 'Gestor', actorUserId: 'actor-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
    expect(roleRepo.roles).toHaveLength(0)
    expect(roleRepo.auditEvents).toHaveLength(0)
  })
})
