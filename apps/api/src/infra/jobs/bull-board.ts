import { timingSafeEqual } from 'node:crypto'

import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'

import type { INestApplication } from '@nestjs/common'
import type { Queue } from 'bullmq'
import type { NextFunction, Request, Response } from 'express'

import { QUEUE_NAMES, queueToken, type QueueName } from '@/infra/queue/queue.tokens'

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function basicAuthMiddleware(
  user: string,
  pass: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"')
      res.status(401).send('Unauthorized')
      return
    }
    const decoded = Buffer.from(header.slice(6), 'base64').toString()
    const colonIndex = decoded.indexOf(':')
    const u = decoded.slice(0, colonIndex)
    const p = decoded.slice(colonIndex + 1)
    if (!constantTimeEquals(u, user) || !constantTimeEquals(p, pass)) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"')
      res.status(401).send('Unauthorized')
      return
    }
    next()
  }
}

export function mountBullBoard(
  app: INestApplication,
  basePath: string,
  auth?: { user: string; pass: string },
): void {
  if (!auth) throw new Error('Bull Board requires Basic Auth credentials to mount')

  const allQueueNames: QueueName[] = Object.values(QUEUE_NAMES)
  if (allQueueNames.length === 0) return

  const queues = allQueueNames.map((name) =>
    app.get<Queue>(queueToken(name), { strict: false }),
  )
  const adapter = new ExpressAdapter()
  adapter.setBasePath(basePath)
  createBullBoard({ queues: queues.map((q) => new BullMQAdapter(q)), serverAdapter: adapter })

  const httpAdapter = app.getHttpAdapter()
  const expressInstance = httpAdapter.getInstance() as { use: (...args: unknown[]) => void }

  expressInstance.use(basePath, basicAuthMiddleware(auth.user, auth.pass), adapter.getRouter())
}
