import { SetMetadata } from '@nestjs/common'

import type { Permission } from '../permissions'

export const REQUIRES_PERMISSION_KEY = 'requiresPermission'
export const RequiresPermission = (...perms: Permission[]) =>
  SetMetadata(REQUIRES_PERMISSION_KEY, perms)
