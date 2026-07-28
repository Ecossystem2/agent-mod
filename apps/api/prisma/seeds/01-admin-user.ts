import type { PrismaClient } from '@prisma/client'
import type { SeedDefinition } from './types'

export const seed: SeedDefinition = {
  name: 'admin-user',
  description: 'Marca usuário admin como isProtected',
  run: async (prisma: PrismaClient) => {
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (admin) {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { isProtected: true },
      })
      console.log(`  → admin ${adminEmail} marcado como isProtected`)
    } else {
      console.log(`  → admin ${adminEmail} não encontrado, nada a fazer`)
    }
  },
}
