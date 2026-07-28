import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { CustomHttpException } from '../exceptions/custom-http.exception'

import type { SessionUser } from '../decorators/current-user.decorator'
import type { Permission } from '@/core/auth/permissions'
import type { Request } from 'express'

import { AuthService } from '@/infra/auth/auth.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return true

    const req = ctx.switchToHttp().getRequest<Request & { user?: SessionUser }>()

    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) headers.set(k, v.join(', '))
      else if (typeof v === 'string') headers.set(k, v)
    }

    const session = await this.auth.getSession(headers)
    if (!session) throw CustomHttpException.unauthorized()

    const sessionWithPerms = session as { user: typeof session.user; permissions?: readonly string[] }
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      emailVerified: session.user.emailVerified,
      permissions: (sessionWithPerms.permissions ?? []) as readonly Permission[],
    }
    return true
  }
}
