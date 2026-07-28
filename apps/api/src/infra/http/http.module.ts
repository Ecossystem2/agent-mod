import { Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis'

import { RolesController } from './controllers/admin/roles.controller'
import { UsersController } from './controllers/admin/users.controller'
import { HealthController } from './controllers/health.controller'
import { AuthGuard } from './guards/auth.guard'
import { PermissionGuard } from './guards/permission.guard'
import { SecurityAuditInterceptor } from './interceptors/security-audit.interceptor'
import { identityTracker, ipTracker } from './throttler/throttler-trackers'

import { SetPasswordPort } from '@/domain/application/ports/set-password-port'
import { CreateRoleUseCase } from '@/domain/application/use-cases/roles/create-role-use-case'
import { DeleteRoleUseCase } from '@/domain/application/use-cases/roles/delete-role-use-case'
import { ListRolesUseCase } from '@/domain/application/use-cases/roles/list-roles-use-case'
import { UpdateRoleUseCase } from '@/domain/application/use-cases/roles/update-role-use-case'
import { CreateAdminUserUseCase } from '@/domain/application/use-cases/users/create-admin-user-use-case'
import { DeactivateUserUseCase } from '@/domain/application/use-cases/users/deactivate-user-use-case'
import { DeleteUserUseCase } from '@/domain/application/use-cases/users/delete-user-use-case'
import { ListUsersUseCase } from '@/domain/application/use-cases/users/list-users-use-case'
import { ReactivateUserUseCase } from '@/domain/application/use-cases/users/reactivate-user-use-case'
import { SetUserPasswordUseCase } from '@/domain/application/use-cases/users/set-user-password-use-case'
import { UpdateUserUseCase } from '@/domain/application/use-cases/users/update-user-use-case'
import { BetterAuthSetPasswordAdapter } from '@/infra/auth/better-auth-set-password.adapter'
import { RedisService } from '@/infra/cache/redis/redis.service'
import { CryptographyModule } from '@/infra/cryptography/cryptography.module'
import { EnvService } from '@/infra/env/env.service'

@Module({
  imports: [
    CryptographyModule,
    ThrottlerModule.forRootAsync({
      inject: [EnvService, RedisService],
      useFactory: (env: EnvService, redis: RedisService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: env.get('THROTTLE_TTL_SECONDS') * 1000,
            limit: env.get('THROTTLE_LIMIT'),
            getTracker: (req: Record<string, unknown>) => identityTracker(req),
          },
          {
            name: 'ip',
            ttl: env.get('THROTTLE_TTL_SECONDS') * 1000,
            limit: env.get('THROTTLE_IP_LIMIT'),
            getTracker: (req: Record<string, unknown>) => ipTracker(req),
          },
        ],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
  ],
  controllers: [HealthController, RolesController, UsersController],
  providers: [
    // Ordem dos APP_GUARD importa: Throttler → Auth → Permission.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: SecurityAuditInterceptor },
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    ListRolesUseCase,
    ListUsersUseCase,
    CreateAdminUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    DeactivateUserUseCase,
    ReactivateUserUseCase,
    SetUserPasswordUseCase,
    BetterAuthSetPasswordAdapter,
    { provide: SetPasswordPort, useExisting: BetterAuthSetPasswordAdapter },
  ],
})
export class HttpModule {}
