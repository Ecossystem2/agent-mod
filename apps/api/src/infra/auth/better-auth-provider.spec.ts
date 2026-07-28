import { describe, expect, it, vi } from 'vitest'

import { BetterAuthProvider } from './better-auth-provider'

import type { AuthService } from './auth.service'
import type { SignInLockoutService } from './sign-in-lockout.service'
import type { PrismaService } from '@/infra/database/prisma/prisma.service'

import { User } from '@/domain/enterprise/entities/user'

function makeUserData(override: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    name: 'Ada',
    email: 'ada@example.com',
    emailVerified: true,
    image: 'https://example.com/a.png',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    ...override,
  }
}

function makeAuthService(api: Record<string, unknown>): AuthService {
  return { api } as unknown as AuthService
}

function makeLockoutService(blocked = false): SignInLockoutService {
  return {
    isBlocked: vi.fn().mockResolvedValue(blocked),
    registerFailure: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  } as unknown as SignInLockoutService
}

function makePrisma(deleteMock = vi.fn().mockResolvedValue(undefined)): PrismaService {
  return { user: { delete: deleteMock } } as unknown as PrismaService
}

describe(BetterAuthProvider.name, () => {
  describe('signIn', () => {
    it('mapeia resposta para User e coleta headers', async () => {
      const headers = new Headers({ 'set-cookie': 'session=abc' })
      const signInEmail = vi.fn().mockResolvedValue({
        response: { user: makeUserData() },
        headers,
      })
      const sut = new BetterAuthProvider(makeAuthService({ signInEmail }), makeLockoutService(), makePrisma())

      const result = await sut.signIn('ada@example.com', 'pass')

      expect(result?.user).toBeInstanceOf(User)
      expect(result?.user.email).toBe('ada@example.com')
      expect(result?.user.id.toString()).toBe('user-1')
      expect(result?.headers).toEqual({ 'set-cookie': 'session=abc' })
    })

    it('retorna null quando não há response.user', async () => {
      const signInEmail = vi.fn().mockResolvedValue({ response: null, headers: new Headers() })
      const sut = new BetterAuthProvider(makeAuthService({ signInEmail }), makeLockoutService(), makePrisma())

      await expect(sut.signIn('x@y.com', 'p')).resolves.toBeNull()
    })

    it('usa null para image ausente e roleIds vazio', async () => {
      const signInEmail = vi.fn().mockResolvedValue({
        response: { user: makeUserData({ image: undefined }) },
        headers: new Headers(),
      })
      const sut = new BetterAuthProvider(makeAuthService({ signInEmail }), makeLockoutService(), makePrisma())

      const result = await sut.signIn('ada@example.com', 'pass')

      expect(result?.user.image).toBeNull()
      expect(result?.user.roleIds).toEqual([])
    })

    it('retorna null sem chamar signInEmail quando email está bloqueado', async () => {
      const signInEmail = vi.fn()
      const sut = new BetterAuthProvider(makeAuthService({ signInEmail }), makeLockoutService(true), makePrisma())

      const result = await sut.signIn('blocked@example.com', 'pass')

      expect(result).toBeNull()
      expect(signInEmail).not.toHaveBeenCalled()
    })

    it('registra falha quando a autenticação não retorna usuário', async () => {
      const signInEmail = vi.fn().mockResolvedValue({ response: null, headers: new Headers() })
      const lockout = makeLockoutService(false)
      const sut = new BetterAuthProvider(makeAuthService({ signInEmail }), lockout, makePrisma())

      await sut.signIn('u@e.com', 'wrong')

      expect(lockout.registerFailure).toHaveBeenCalledWith('u@e.com')
      expect(lockout.clear).not.toHaveBeenCalled()
    })

    it('limpa lockout após login bem-sucedido', async () => {
      const signInEmail = vi.fn().mockResolvedValue({
        response: { user: makeUserData() },
        headers: new Headers(),
      })
      const lockout = makeLockoutService(false)
      const sut = new BetterAuthProvider(makeAuthService({ signInEmail }), lockout, makePrisma())

      await sut.signIn('ada@example.com', 'pass')

      expect(lockout.clear).toHaveBeenCalledWith('ada@example.com')
      expect(lockout.registerFailure).not.toHaveBeenCalled()
    })
  })

  describe('signUp', () => {
    it('mapeia resposta para User', async () => {
      const signUpEmail = vi.fn().mockResolvedValue({ user: makeUserData() })
      const sut = new BetterAuthProvider(makeAuthService({ signUpEmail }), makeLockoutService(), makePrisma())

      const result = await sut.signUp('Ada', 'ada@example.com', 'pass')

      expect(result.user).toBeInstanceOf(User)
      expect(result.user?.name).toBe('Ada')
    })

    it('retorna user null quando o better-auth não cria', async () => {
      const signUpEmail = vi.fn().mockResolvedValue({ user: null })
      const sut = new BetterAuthProvider(makeAuthService({ signUpEmail }), makeLockoutService(), makePrisma())

      await expect(sut.signUp('Ada', 'ada@example.com', 'pass')).resolves.toEqual({ user: null })
    })

    it('usa null para image ausente no signUp e roleIds vazio', async () => {
      const signUpEmail = vi
        .fn()
        .mockResolvedValue({ user: makeUserData({ image: undefined }) })
      const sut = new BetterAuthProvider(makeAuthService({ signUpEmail }), makeLockoutService(), makePrisma())

      const result = await sut.signUp('Ada', 'ada@example.com', 'pass')

      expect(result.user?.image).toBeNull()
      expect(result.user?.roleIds).toEqual([])
    })

    it('retorna user null quando o e-mail já existe (erro do better-auth)', async () => {
      const signUpEmail = vi
        .fn()
        .mockRejectedValue(new Error('User already exists. Use another email.'))
      const sut = new BetterAuthProvider(makeAuthService({ signUpEmail }), makeLockoutService(), makePrisma())

      await expect(sut.signUp('Ada', 'ada@example.com', 'pass')).resolves.toEqual({ user: null })
    })

    it('retorna user null quando o e-mail já existe (erro Prisma P2002)', async () => {
      const prismaErr = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
      const signUpEmail = vi.fn().mockRejectedValue(prismaErr)
      const sut = new BetterAuthProvider(makeAuthService({ signUpEmail }), makeLockoutService(), makePrisma())

      await expect(sut.signUp('Ada', 'ada@example.com', 'pass')).resolves.toEqual({ user: null })
    })

    it('propaga erro que não é de e-mail duplicado', async () => {
      const signUpEmail = vi.fn().mockRejectedValue(new Error('network down'))
      const sut = new BetterAuthProvider(makeAuthService({ signUpEmail }), makeLockoutService(), makePrisma())

      await expect(sut.signUp('Ada', 'ada@example.com', 'pass')).rejects.toThrow('network down')
    })

    it('propaga erro que não é Error', async () => {
      const signUpEmail = vi.fn().mockRejectedValue('weird')
      const sut = new BetterAuthProvider(makeAuthService({ signUpEmail }), makeLockoutService(), makePrisma())

      await expect(sut.signUp('Ada', 'ada@example.com', 'pass')).rejects.toBe('weird')
    })
  })

  describe('deleteUser', () => {
    it('remove o usuário pelo id via Prisma', async () => {
      const deleteMock = vi.fn().mockResolvedValue(undefined)
      const sut = new BetterAuthProvider(
        makeAuthService({}),
        makeLockoutService(),
        makePrisma(deleteMock),
      )

      await sut.deleteUser('user-1')

      expect(deleteMock).toHaveBeenCalledWith({ where: { id: 'user-1' } })
    })
  })
})
