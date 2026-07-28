import { Injectable } from '@nestjs/common'
import { hashPassword } from 'better-auth/crypto'

import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'

import { SetPasswordPort } from '@/domain/application/ports/set-password-port'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

@Injectable()
export class BetterAuthSetPasswordAdapter extends SetPasswordPort {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async setPassword(userId: string, newPassword: string, audit: AuditEventInput): Promise<void> {
    const hash = await hashPassword(newPassword)
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.account.updateMany({
        where: { userId, providerId: 'credential' },
        data: { password: hash },
      })
      if (count === 0) {
        throw new Error(`No credential account found for user "${userId}"`)
      }
      await tx.auditEvent.create({
        data: {
          actorUserId: audit.actorUserId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          metadata: audit.metadata !== undefined ? (audit.metadata as object) : undefined,
        },
      })
    })
  }
}
