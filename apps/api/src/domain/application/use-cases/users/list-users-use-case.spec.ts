import { makeUser } from '@test/factories'
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository'
import { InMemoryUserRoleAssignmentRepository } from '@test/repositories/in-memory-user-role-assignment-repository'
import { beforeEach, describe, expect, it } from 'vitest'

import { ListUsersUseCase } from './list-users-use-case'

describe(ListUsersUseCase.name, () => {
  let userRepo: InMemoryUserRepository
  let assignmentRepo: InMemoryUserRoleAssignmentRepository
  let sut: ListUsersUseCase

  beforeEach(() => {
    userRepo = new InMemoryUserRepository()
    assignmentRepo = new InMemoryUserRoleAssignmentRepository()
    sut = new ListUsersUseCase(userRepo, assignmentRepo)
  })

  it('retorna lista vazia e nextCursor null quando não há usuários', async () => {
    const result = await sut.execute({})

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users).toHaveLength(0)
      expect(result.value.nextCursor).toBeNull()
    }
  })

  it('lista usuários com seus roles', async () => {
    const user1 = makeUser({ email: 'ada@example.com', id: 'user-1' })
    const user2 = makeUser({ email: 'grace@example.com', id: 'user-2' })
    userRepo.users.push(user1, user2)
    await assignmentRepo.replaceAll('user-1', ['role-admin', 'role-gestor'])
    await assignmentRepo.replaceAll('user-2', ['role-viewer'])

    const result = await sut.execute({})

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users).toHaveLength(2)
      const ada = result.value.users.find((u) => u.user.email === 'ada@example.com')
      expect(ada?.roleIds).toEqual(['role-admin', 'role-gestor'])
      const grace = result.value.users.find((u) => u.user.email === 'grace@example.com')
      expect(grace?.roleIds).toEqual(['role-viewer'])
    }
  })

  it('retorna roleIds vazio para usuários sem cargo', async () => {
    userRepo.users.push(makeUser({ email: 'sem-cargo@example.com', id: 'user-1' }))

    const result = await sut.execute({})

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users[0].roleIds).toEqual([])
    }
  })

  it('pagina por cursor: primeira página retorna nextCursor e a próxima continua de onde parou', async () => {
    for (let i = 1; i <= 30; i++) {
      userRepo.users.push(makeUser({ email: `user${i}@example.com`, id: `user-${String(i).padStart(2, '0')}` }))
    }

    const first = await sut.execute({ limit: 10 })
    expect(first.isRight()).toBe(true)
    if (!first.isRight()) return
    expect(first.value.users).toHaveLength(10)
    expect(first.value.nextCursor).not.toBeNull()

    const second = await sut.execute({ limit: 10, cursor: first.value.nextCursor! })
    expect(second.isRight()).toBe(true)
    if (!second.isRight()) return
    expect(second.value.users).toHaveLength(10)

    const firstIds = first.value.users.map((u) => u.user.id.toString())
    const secondIds = second.value.users.map((u) => u.user.id.toString())
    expect(firstIds.some((id) => secondIds.includes(id))).toBe(false)
  })

  it('retorna nextCursor null na última página', async () => {
    for (let i = 1; i <= 5; i++) {
      userRepo.users.push(makeUser({ email: `user${i}@example.com`, id: `user-${i}` }))
    }

    const result = await sut.execute({ limit: 10 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users).toHaveLength(5)
      expect(result.value.nextCursor).toBeNull()
    }
  })

  it('sempre retorna Right (sem erros possíveis)', async () => {
    const result = await sut.execute({})

    expect(result.isRight()).toBe(true)
    expect(result.isLeft()).toBe(false)
  })
})
