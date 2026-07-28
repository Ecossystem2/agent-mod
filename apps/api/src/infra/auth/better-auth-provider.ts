import { Injectable } from '@nestjs/common'

import { AuthService } from './auth.service'
import { SignInLockoutService } from './sign-in-lockout.service'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { AuthProvider } from '@/domain/application/providers/auth-provider'
import { User } from '@/domain/enterprise/entities/user'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

function isDuplicateEmailError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const code = (err as { code?: string }).code
  if (code === 'P2002') return true
  return /already.exist|duplicate|in.use|unique.constraint/i.test(err.message)
}

@Injectable()
export class BetterAuthProvider implements AuthProvider {
  constructor(
    private readonly auth: AuthService,
    private readonly lockout: SignInLockoutService,
    private readonly prisma: PrismaService,
  ) {}

  async signIn(
    email: string,
    password: string,
  ): Promise<{ user: User; headers?: Record<string, string> } | null> {
    const blocked = await this.lockout.isBlocked(email)
    if (blocked) return null

    const result = await this.auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    })

    if (!result.response?.user) {
      await this.lockout.registerFailure(email)
      return null
    }

    await this.lockout.clear(email)

    const userData = result.response.user
    const user = User.create(
      {
        name: userData.name,
        email: userData.email,
        emailVerified: userData.emailVerified,
        image: userData.image ?? null,
        roleIds: [],
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
      new UniqueEntityID(userData.id),
    )

    const headers: Record<string, string> = {}
    result.headers.forEach((value, key) => {
      headers[key] = value
    })

    return { user, headers }
  }

  async signUp(name: string, email: string, password: string): Promise<{ user: User | null }> {
    try {
      const result = await this.auth.api.signUpEmail({
        body: { name, email, password },
      })

      if (!result.user) return { user: null }

      const userData = result.user
      const user = User.create(
        {
          name: userData.name,
          email: userData.email,
          emailVerified: userData.emailVerified,
          image: userData.image ?? null,
          roleIds: [],
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        },
        new UniqueEntityID(userData.id),
      )

      return { user }
    } catch (err) {
      if (isDuplicateEmailError(err)) return { user: null }
      throw err
    }
  }

  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } })
  }
}
