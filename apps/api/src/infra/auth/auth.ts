import { betterAuth, type Auth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { customSession } from 'better-auth/plugins'

import type { PrismaClient } from '@prisma/client'
import type Redis from 'ioredis'

import { permissionsCacheKey } from '@/domain/application/cache/permissions-cache'

export interface CreateAuthEnv {
  AUTH_SECRET: string
  AUTH_BASE_URL: string
  AUTH_TRUSTED_ORIGINS: string[]
  SECURE_COOKIES: boolean
  AUTH_COOKIE_DOMAIN?: string
  AUTH_RATE_LIMIT_WINDOW: number
  AUTH_RATE_LIMIT_MAX: number
  MAIL_ENABLED: boolean
  PERMISSIONS_CACHE_TTL_SECONDS: number
}

export interface PermissionsCache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, opts: { ttlSeconds: number }): Promise<void>
}

export { permissionsCacheKey }

export function createAuth(
  prisma: PrismaClient,
  env: CreateAuthEnv,
  redis: Redis,
  cache: PermissionsCache,
): Auth {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: env.AUTH_SECRET,
    baseURL: env.AUTH_BASE_URL,
    trustedOrigins: env.AUTH_TRUSTED_ORIGINS,

    secondaryStorage: {
      get: (key) => redis.get(key),
      set: async (key, value, ttl) => {
        if (ttl) await redis.set(key, value, 'EX', ttl)
        else await redis.set(key, value)
      },
      delete: async (key) => {
        await redis.del(key)
      },
    },

    rateLimit: {
      enabled: true,
      window: env.AUTH_RATE_LIMIT_WINDOW,
      max: env.AUTH_RATE_LIMIT_MAX,
      storage: 'secondary-storage',
      // Teto por-path: o front chama `get-session` a cada navegação/foco, então
      // aplicar o `max` estrito de sign-in a tudo derruba a sessão com 429.
      // get-session generoso; sign-in/sign-up estritos; resto herda o `max`.
      customRules: {
        '/get-session': { window: env.AUTH_RATE_LIMIT_WINDOW, max: 300 },
        '/sign-in/email': { window: env.AUTH_RATE_LIMIT_WINDOW, max: 10 },
        '/sign-up/email': { window: env.AUTH_RATE_LIMIT_WINDOW, max: 10 },
      },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: env.MAIL_ENABLED,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },

    session: {
      expiresIn: 60 * 60 * 24 * 3,
      updateAge: 60 * 60 * 24,
      storeSessionInDatabase: true,
    },

    advanced: {
      ...(env.AUTH_COOKIE_DOMAIN
        ? { crossSubDomainCookies: { enabled: true, domain: env.AUTH_COOKIE_DOMAIN } }
        : {}),
      cookies: {
        session_token: {
          attributes: {
            httpOnly: true,
            secure: env.SECURE_COOKIES,
            sameSite: 'lax',
          },
        },
      },
      defaultCookieAttributes: {
        httpOnly: true,
        secure: env.SECURE_COOKIES,
        sameSite: 'lax',
      },
    },

    plugins: [
      customSession(async ({ user, session }) => {
        const cacheKey = permissionsCacheKey(user.id)

        // Leitura de cache é best-effort: um blip de Redis NÃO pode derrubar a
        // sessão de todos — degrada pro DB (mais lento, mas correto).
        try {
          const cached = await cache.get<string[]>(cacheKey)
          if (cached) return { user, session, permissions: cached }
        } catch (err) {
          console.error('[customSession] leitura de cache falhou, indo pro DB:', err)
        }

        // O DB é a fonte da verdade — se ele cair, aí sim propaga (não dá pra
        // resolver permissions; liberar com `[]` seria escalonamento silencioso).
        let assignments
        try {
          assignments = await prisma.userRoleAssignment.findMany({
            where: { userId: user.id },
            include: { role: { include: { permissions: true } } },
          })
        } catch (err) {
          console.error('[customSession] falha ao carregar permissions do DB:', err)
          throw err
        }
        const permissions = [
          ...new Set(assignments.flatMap((a) => a.role.permissions.map((p) => p.permission))),
        ]

        try {
          await cache.set(cacheKey, permissions, {
            ttlSeconds: env.PERMISSIONS_CACHE_TTL_SECONDS,
          })
        } catch (err) {
          console.error('[customSession] escrita de cache falhou:', err)
        }

        return { user, session, permissions }
      }),
    ],
  // customSession plugin alarga o tipo de retorno; better-auth não exporta o tipo
  // enriquecido, então o cast duplo é necessário para satisfazer o compilador.
  }) as unknown as Auth
}

export type AppAuth = ReturnType<typeof createAuth>
