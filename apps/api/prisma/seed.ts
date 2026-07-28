import 'dotenv/config'
import { makeSeedPrismaClient } from './make-seed-prisma-client'
import { seeds } from './seeds/index'

// Modo não-interativo: executa apenas seeds que ainda não rodaram com sucesso.
// Para o menu interativo (usado no deploy) use: pnpm prisma:seed:interactive

const prisma = makeSeedPrismaClient()

async function main(): Promise<void> {
  const history = await prisma.seedHistory.findMany({ where: { success: true } })
  const ran = new Set(history.map((r) => r.name))
  const pending = seeds.filter((s) => !ran.has(s.name))

  if (pending.length === 0) {
    console.log('→ seed: todos os seeds já foram executados.')
    return
  }

  for (const seed of pending) {
    console.log(`→ seed: executando ${seed.name}…`)
    try {
      await seed.run(prisma)
      await prisma.seedHistory.upsert({
        where: { name: seed.name },
        create: { name: seed.name, success: true },
        update: { ranAt: new Date(), success: true },
      })
      console.log(`→ seed: ${seed.name} concluído.`)
    } catch (err) {
      await prisma.seedHistory.upsert({
        where: { name: seed.name },
        create: { name: seed.name, success: false },
        update: { ranAt: new Date(), success: false },
      })
      console.error(`→ seed: ${seed.name} falhou.`, err)
      throw err
    }
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
