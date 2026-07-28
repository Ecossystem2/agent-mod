import { describe, expect, it } from 'vitest'

import { CannotDeleteSelfError } from './cannot-delete-self-error'
import { EmailAlreadyInUseError } from './email-already-in-use-error'
import { LastAdminError } from './last-admin-error'
import { RoleInUseError } from './role-in-use-error'
import { RoleIsSystemError } from './role-is-system-error'
import { RoleNameTakenError } from './role-name-taken-error'
import { RoleNotFoundError } from './role-not-found-error'
import { UserNotFoundError } from './user-not-found-error'

describe('RoleNameTakenError', () => {
  it('tem kind correto e mensagem com o nome', () => {
    const sut = new RoleNameTakenError('Gestor')

    expect(sut.kind).toBe('RoleNameTaken')
    expect(sut.message).toBe('Já existe um cargo com o nome "Gestor".')
    expect(sut).toBeInstanceOf(Error)
  })
})

describe('RoleNotFoundError', () => {
  it('tem kind correto e mensagem', () => {
    const sut = new RoleNotFoundError()

    expect(sut.kind).toBe('RoleNotFound')
    expect(sut.message).toBe('Cargo não encontrado.')
    expect(sut).toBeInstanceOf(Error)
  })
})

describe('RoleIsSystemError', () => {
  it('tem kind correto e mensagem', () => {
    const sut = new RoleIsSystemError()

    expect(sut.kind).toBe('RoleIsSystem')
    expect(sut.message).toBe('Cargos de sistema não podem ser modificados ou excluídos.')
    expect(sut).toBeInstanceOf(Error)
  })
})

describe('RoleInUseError', () => {
  it('tem kind correto e mensagem com contagem', () => {
    const sut = new RoleInUseError(3)

    expect(sut.kind).toBe('RoleInUse')
    expect(sut.message).toBe('Este cargo está atribuído a 3 usuário(s) e não pode ser excluído.')
    expect(sut).toBeInstanceOf(Error)
  })

  it('inclui contagem de 1 usuário na mensagem', () => {
    const sut = new RoleInUseError(1)

    expect(sut.message).toContain('1 usuário(s)')
  })
})

describe('UserNotFoundError', () => {
  it('tem kind correto e mensagem', () => {
    const sut = new UserNotFoundError()

    expect(sut.kind).toBe('UserNotFound')
    expect(sut.message).toBe('Usuário não encontrado.')
    expect(sut).toBeInstanceOf(Error)
  })
})

describe('CannotDeleteSelfError', () => {
  it('tem kind correto e mensagem', () => {
    const sut = new CannotDeleteSelfError()

    expect(sut.kind).toBe('CannotDeleteSelf')
    expect(sut.message).toBe('Você não pode excluir sua própria conta.')
    expect(sut).toBeInstanceOf(Error)
  })
})

describe('LastAdminError', () => {
  it('tem kind correto e mensagem', () => {
    const sut = new LastAdminError()

    expect(sut.kind).toBe('LastAdmin')
    expect(sut.message).toBe('Não é possível excluir o último administrador do sistema.')
    expect(sut).toBeInstanceOf(Error)
  })
})

describe('EmailAlreadyInUseError', () => {
  it('tem kind correto e mensagem com o email', () => {
    const sut = new EmailAlreadyInUseError('ada@example.com')

    expect(sut.kind).toBe('EmailAlreadyInUse')
    expect(sut.message).toBe('O e-mail "ada@example.com" já está em uso.')
    expect(sut).toBeInstanceOf(Error)
  })
})
