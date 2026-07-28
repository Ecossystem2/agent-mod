import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { REQUIRES_PERMISSION_KEY } from '../decorators/requires-permission.decorator'
import { CustomHttpException } from '../exceptions/custom-http.exception'
import { hasAnyPermission, type Permission } from '../permissions'

import type { SessionUser } from '../decorators/current-user.decorator'
import type { Request } from 'express'

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRES_PERMISSION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    )
    if (!required || required.length === 0) return true

    const req = ctx.switchToHttp().getRequest<Request & { user?: SessionUser }>()
    if (!req.user) throw CustomHttpException.unauthorized()

    const userPerms = req.user.permissions as string[] | undefined | null
    if (!Array.isArray(userPerms)) {
      throw CustomHttpException.forbidden()
    }
    if (!hasAnyPermission(userPerms, required)) {
      throw CustomHttpException.forbidden()
    }
    return true
  }
}
