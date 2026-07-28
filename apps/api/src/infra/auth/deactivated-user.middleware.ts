import type { PrismaService } from '@/infra/database/prisma/prisma.service'
import type { RequestHandler } from 'express'

interface SignInBody {
  email?: string
}

function parseBody(raw: unknown): SignInBody {
  if (typeof raw === 'string') return JSON.parse(raw) as SignInBody
  if (Buffer.isBuffer(raw)) return JSON.parse(raw.toString()) as SignInBody
  return (raw as SignInBody | null | undefined) ?? {}
}

export function createDeactivatedUserMiddleware(prisma: PrismaService): RequestHandler {
  return async (req, res, next) => {
    let email: string | undefined
    try {
      email = parseBody(req.body).email?.toLowerCase().trim()
    } catch (err) {
      console.error('[DeactivatedUserMiddleware] error parsing request body:', err)
      res.status(400).json({ error: 'invalid_request_body' })
      return
    }

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { isActive: true },
      })
      if (user && !user.isActive) {
        res.status(403).json({ error: 'account_disabled' })
        return
      }
    }
    next()
  }
}
