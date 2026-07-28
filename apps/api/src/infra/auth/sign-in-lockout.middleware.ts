import type { SignInLockoutService } from './sign-in-lockout.service'
import type { RequestHandler } from 'express'

interface SignInBody {
  email?: string
}

function parseBody(raw: unknown): SignInBody {
  if (typeof raw === 'string') return JSON.parse(raw) as SignInBody
  if (Buffer.isBuffer(raw)) return JSON.parse(raw.toString()) as SignInBody
  return (raw as SignInBody | null | undefined) ?? {}
}

export function createSignInLockoutMiddleware(lockout: SignInLockoutService): RequestHandler {
  return async (req, res, next) => {
    let email: string | undefined
    try {
      email = parseBody(req.body).email?.toLowerCase().trim()
    } catch (err) {
      console.error('[SignInLockoutMiddleware] error parsing request body:', err)
      res.status(400).json({ error: 'invalid_request_body' })
      return
    }

    if (!email) {
      next()
      return
    }

    if (await lockout.isBlocked(email)) {
      res.status(429).json({ error: 'too_many_attempts' })
      return
    }

    const settle = (): void => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void lockout.clear(email)
        return
      }
      // Só credencial inválida (401) conta como tentativa falha. 400 (body
      // malformado), 429 (já bloqueado) e 5xx NÃO incrementam — senão um atacante
      // trava a conta da vítima mandando requests inválidos com o email dela
      // (lockout vira DoS de conta), e o 429 realimenta o próprio contador.
      if (res.statusCode === 401) {
        void lockout.registerFailure(email)
      }
    }
    res.once('finish', settle)

    next()
  }
}
