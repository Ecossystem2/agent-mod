import { Global, Module } from '@nestjs/common'

import { createAuth, type AppAuth } from './auth'
import { AUTH_INSTANCE, AuthService } from './auth.service'
import { BetterAuthProvider } from './better-auth-provider'
import { SignInLockoutService } from './sign-in-lockout.service'

import { CacheRepository } from '@/domain/application/cache/cache-repository'
import { AuthProvider } from '@/domain/application/providers/auth-provider'
import { RedisService } from '@/infra/cache/redis/redis.service'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { EnvService } from '@/infra/env/env.service'

@Global()
@Module({
  providers: [
    {
      provide: AUTH_INSTANCE,
      useFactory: (
        prisma: PrismaService,
        env: EnvService,
        redis: RedisService,
        cache: CacheRepository,
      ): AppAuth =>
        createAuth(
          prisma,
          {
            AUTH_SECRET: env.get('AUTH_SECRET'),
            AUTH_BASE_URL: env.get('AUTH_BASE_URL'),
            AUTH_TRUSTED_ORIGINS: env.get('AUTH_TRUSTED_ORIGINS'),
            SECURE_COOKIES: env.get('SECURE_COOKIES'),
            AUTH_COOKIE_DOMAIN: env.get('AUTH_COOKIE_DOMAIN'),
            AUTH_RATE_LIMIT_WINDOW: env.get('AUTH_RATE_LIMIT_WINDOW'),
            AUTH_RATE_LIMIT_MAX: env.get('AUTH_RATE_LIMIT_MAX'),
            MAIL_ENABLED: env.get('MAIL_ENABLED'),
            PERMISSIONS_CACHE_TTL_SECONDS: env.get('PERMISSIONS_CACHE_TTL_SECONDS'),
          },
          redis,
          cache,
        ),
      inject: [PrismaService, EnvService, RedisService, CacheRepository],
    },
    AuthService,
    SignInLockoutService,
    { provide: AuthProvider, useClass: BetterAuthProvider },
  ],
  exports: [AuthService, AUTH_INSTANCE, AuthProvider],
})
export class AuthModule {}
