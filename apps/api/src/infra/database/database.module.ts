import { Global, Module } from '@nestjs/common'

import { PrismaService } from './prisma/prisma.service'
import { PrismaRoleRepository } from './prisma/repositories/prisma-role-repository'
import { PrismaUserRepository } from './prisma/repositories/prisma-user-repository'
import { PrismaUserRoleAssignmentRepository } from './prisma/repositories/prisma-user-role-assignment-repository'

import { RoleRepository } from '@/domain/application/repositories/role-repository'
import { UserRepository } from '@/domain/application/repositories/user-repository'
import { UserRoleAssignmentRepository } from '@/domain/application/repositories/user-role-assignment-repository'

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: RoleRepository, useClass: PrismaRoleRepository },
    { provide: UserRoleAssignmentRepository, useClass: PrismaUserRoleAssignmentRepository },
    { provide: UserRepository, useClass: PrismaUserRepository },
  ],
  exports: [
    PrismaService,
    RoleRepository,
    UserRoleAssignmentRepository,
    UserRepository,
  ],
})
export class DatabaseModule {}
