import type { SeedDefinition } from './types'
import { seed as adminUser } from './01-admin-user'

// Adicione novos seeds aqui na ordem desejada de execução.
export const seeds: SeedDefinition[] = [adminUser]
