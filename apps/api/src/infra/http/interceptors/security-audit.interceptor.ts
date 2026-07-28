import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { tap, type Observable } from 'rxjs'

import { REQUIRES_PERMISSION_KEY } from '../decorators/requires-permission.decorator'

import type { SessionUser } from '../decorators/current-user.decorator'
import type { Request } from 'express'

@Injectable()
export class SecurityAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SecurityAudit')

  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRES_PERMISSION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    )
    if (!required || required.length === 0) return next.handle()

    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: SessionUser; actorUserId?: string }>()

    const start = Date.now()
    return next.handle().pipe(
      tap({
        next: () => this.audit(req, required, Date.now() - start, 'ok'),
        error: (err: Error) =>
          this.audit(req, required, Date.now() - start, 'error', err.message),
      }),
    )
  }

  private audit(
    req: Request & { user?: SessionUser; actorUserId?: string },
    perms: string[],
    durationMs: number,
    outcome: 'ok' | 'error',
    errMessage?: string,
  ): void {
    this.logger.log({
      msg: 'sensitive-route',
      method: req.method,
      url: req.originalUrl,
      authUserId: req.user?.id,
      actorUserId: req.actorUserId ?? req.user?.id,
      requiredPerms: perms,
      durationMs,
      outcome,
      ...(errMessage ? { errMessage } : {}),
    })
  }
}
