import 'reflect-metadata'

import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { toNodeHandler } from 'better-auth/node'
import express from 'express'
import helmet from 'helmet'

import { AppModule } from './app.module'
import { AuthService } from './auth/auth.service'
import { createDeactivatedUserMiddleware } from './auth/deactivated-user.middleware'
import { createSignInLockoutMiddleware } from './auth/sign-in-lockout.middleware'
import { SignInLockoutService } from './auth/sign-in-lockout.service'
import { PrismaService } from './database/prisma/prisma.service'
import { EnvService } from './env/env.service'
import { mountBullBoard } from './jobs/bull-board'

import type { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: false,
  })

  const env = app.get(EnvService)
  const logger = new Logger('bootstrap')

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'connect-src': ["'self'", ...env.get('CORS_ALLOWED_ORIGINS')],
          // Sem wildcard `https:` — img-src frouxo permite exfil via <img src>.
          'img-src': ["'self'", 'data:'],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'frame-src': ["'none'"],
          'worker-src': ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )

  app.enableCors({
    origin: env.get('CORS_ALLOWED_ORIGINS'),
    credentials: true,
    exposedHeaders: ['Set-Cookie'],
  })

  // Nº exato de hops de proxy confiáveis (deve bater com a cadeia real do deploy;
  // `1` = um reverse-proxy só). O throttler chaveia por sessão, não por `req.ip`
  // (ver throttler-trackers), então `req.ip` spoofável via XFF não colapsa o
  // rate-limit — mas mantenha este valor correto pra `secure`/protocolo do cookie.
  app.set('trust proxy', env.get('TRUST_PROXY'))

  const auth = app.get(AuthService)
  const prisma = app.get(PrismaService)
  const lockout = app.get(SignInLockoutService)
  const expressApp = app.getHttpAdapter().getInstance()

  expressApp.post(
    '/api/auth/sign-in/email',
    express.json({ limit: '10kb' }),
    createDeactivatedUserMiddleware(prisma),
    createSignInLockoutMiddleware(lockout),
  )

  // Express 5 (path-to-regexp v8) removeu o wildcard anônimo — `*` sem nome
  // derruba o boot com "Missing parameter name". Sempre nomeie: `*splat`.
  expressApp.all('/api/auth/*splat', toNodeHandler(auth.instance))

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  if (env.get('BULL_BOARD_ENABLED')) {
    const pass = env.get('BULL_BOARD_PASS')
    mountBullBoard(app, env.get('BULL_BOARD_PATH'), pass ? { user: env.get('BULL_BOARD_USER'), pass } : undefined)
  }

  // `health` fica FORA do prefixo `/api` — o healthcheck do Docker/K8s bate em
  // `/health` (localhost, sem passar pelo Vite proxy). Sem o exclude, o health
  // vira `/api/health` e o container fica "unhealthy" pra sempre (404).
  app.setGlobalPrefix('api', { exclude: ['health'] })

  await app.listen(env.get('PORT'))
  logger.log(`API pronta em http://localhost:${env.get('PORT')}`)
  if (env.get('BULL_BOARD_ENABLED')) {
    logger.log(`Bull Board: ${env.get('BULL_BOARD_PATH')}`)
  }

  const shutdown = async (signal: string) => {
    console.log(`[Bootstrap] ${signal} received — starting graceful shutdown`)
    const forceExit = setTimeout(() => {
      console.error('[Bootstrap] Shutdown timeout — forcing exit')
      process.exit(1)
    }, 30_000)
    forceExit.unref()
    await app.close()
    clearTimeout(forceExit)
    console.log('[Bootstrap] Graceful shutdown complete')
    process.exit(0)
  }
  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })
}

bootstrap().catch((err) => {
  console.error('Falha no bootstrap:', err)
  process.exit(1)
})
