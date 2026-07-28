import 'dotenv/config'
import { makeSeedPrismaClient } from './make-seed-prisma-client'
import type { SeedDefinition } from './seeds/types'
import { seeds } from './seeds/index'

const prisma = makeSeedPrismaClient()

type SeedRecord = { name: string; ranAt: Date; success: boolean }

async function loadHistory(): Promise<Map<string, SeedRecord>> {
  const rows = await prisma.seedHistory.findMany()
  return new Map(rows.map((r) => [r.name, r]))
}

async function executeSeed(seed: SeedDefinition): Promise<void> {
  console.log(`\n→ Executando: ${seed.name}`)
  try {
    await seed.run(prisma)
    await prisma.seedHistory.upsert({
      where: { name: seed.name },
      create: { name: seed.name, success: true },
      update: { ranAt: new Date(), success: true },
    })
    console.log(`  ✓ Concluído`)
  } catch (err) {
    await prisma.seedHistory.upsert({
      where: { name: seed.name },
      create: { name: seed.name, success: false },
      update: { ranAt: new Date(), success: false },
    })
    console.error(`  ✗ Erro:`, err)
    throw err
  }
}

function formatStatus(record: SeedRecord | undefined): string {
  if (!record) return '– não executado'
  const d = record.ranAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return record.success ? `✓ executado ${d}` : `✗ falhou ${d}`
}

// ── ANSI helpers ─────────────────────────────────────────────────────────────

const ESC = '\x1b['
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const hideCursor = () => process.stdout.write('\x1b[?25l')
const showCursor = () => process.stdout.write('\x1b[?25h')

function eraseBlock(lineCount: number): void {
  for (let i = 0; i < lineCount; i++) {
    process.stdout.write(`${ESC}1A${ESC}2K`)
  }
  process.stdout.write(`${ESC}1G`)
}

// ── Menu rendering ────────────────────────────────────────────────────────────

const COL_NAME = 22
const COL_STATUS = 26
const BOX_W = 66

function buildMenuLines(
  list: SeedDefinition[],
  history: Map<string, SeedRecord>,
  cursor: number,
  selected: Set<number>,
  secondsLeft: number,
): string[] {
  const border = '─'.repeat(BOX_W)
  const lines: string[] = []

  lines.push(`┌${border}┐`)
  const title = 'Seeds disponíveis'
  const pad = Math.floor((BOX_W - title.length) / 2)
  lines.push(`│${' '.repeat(pad)}${bold(title)}${' '.repeat(BOX_W - pad - title.length)}│`)
  lines.push(`└${border}┘`)
  lines.push('')

  for (let i = 0; i < list.length; i++) {
    const s = list[i]
    const isCursor = i === cursor
    const isSelected = selected.has(i)
    const record = history.get(s.name)
    const rawStatus = formatStatus(record)

    const pointer = isCursor ? yellow('▶') : ' '
    const checkbox = isSelected ? green('[x]') : dim('[ ]')
    const name = s.name.slice(0, COL_NAME).padEnd(COL_NAME)
    const statusRaw = rawStatus.padEnd(COL_STATUS)
    const status = record?.success
      ? green(statusRaw)
      : record
        ? red(statusRaw)
        : dim(statusRaw)

    const desc = isCursor ? bold(s.description) : dim(s.description)

    lines.push(`  ${pointer} ${checkbox} ${name} ${status} ${desc}`)
  }

  lines.push('')
  lines.push(
    dim('  ↑/↓ navegar  ·  Espaço selecionar  ·  Enter confirmar  ·  a=não executados  ·  r=todos  ·  q=pular'),
  )
  lines.push('')

  const timerMsg =
    secondsLeft > 0
      ? `  Continuando em ${yellow(String(secondsLeft) + 's')} com a seleção atual…`
      : `  Executando seleção automaticamente…`
  lines.push(timerMsg)

  return lines
}

// ── Interactive select ────────────────────────────────────────────────────────

async function showMenu(
  list: SeedDefinition[],
  history: Map<string, SeedRecord>,
): Promise<SeedDefinition[]> {
  if (!process.stdout.isTTY) {
    console.error('seed-runner requer TTY. Para modo não-interativo use: pnpm prisma:seed')
    process.exit(1)
  }

  // Pre-select all unexecuted or failed seeds
  const selected = new Set<number>()
  list.forEach((s, i) => {
    const r = history.get(s.name)
    if (!r || !r.success) selected.add(i)
  })

  let cursor = 0
  let secondsLeft = 30

  return new Promise((resolve) => {
    let lines = buildMenuLines(list, history, cursor, selected, secondsLeft)

    hideCursor()
    process.stdout.write('\n')
    process.stdout.write(lines.join('\n') + '\n')

    function redraw(): void {
      lines = buildMenuLines(list, history, cursor, selected, secondsLeft)
      eraseBlock(lines.length)
      process.stdout.write(lines.join('\n') + '\n')
    }

    function cleanup(): void {
      clearInterval(timer)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.removeAllListeners('data')
      showCursor()
    }

    function finish(toRun: SeedDefinition[]): void {
      cleanup()
      eraseBlock(lines.length)
      process.stdout.write('\n')
      resolve(toRun)
    }

    const timer = setInterval(() => {
      secondsLeft--
      if (secondsLeft <= 0) {
        finish(list.filter((_, i) => selected.has(i)))
        return
      }
      redraw()
    }, 1000)

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (key: string) => {
      // Any interaction resets the timer
      secondsLeft = 30

      if (key === '') {
        // Ctrl+C
        cleanup()
        process.stdout.write('\n')
        process.exit(0)
      } else if (key === '[A') {
        // Up arrow
        cursor = Math.max(0, cursor - 1)
      } else if (key === '[B') {
        // Down arrow
        cursor = Math.min(list.length - 1, cursor + 1)
      } else if (key === ' ') {
        // Space: toggle
        if (selected.has(cursor)) selected.delete(cursor)
        else selected.add(cursor)
      } else if (key === '\r' || key === '\n') {
        // Enter: confirm
        finish(list.filter((_, i) => selected.has(i)))
        return
      } else if (key === 'a') {
        // Select all unexecuted / failed
        list.forEach((s, i) => {
          const r = history.get(s.name)
          if (!r || !r.success) selected.add(i)
          else selected.delete(i)
        })
      } else if (key === 'r') {
        // Select all (re-run)
        list.forEach((_, i) => selected.add(i))
      } else if (key === 'q' || key === '') {
        // q / Escape: skip all
        finish([])
        return
      }

      redraw()
    })

    process.once('SIGINT', () => {
      cleanup()
      process.exit(0)
    })
  })
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const history = await loadHistory()

  if (seeds.length === 0) {
    console.log('→ seed: nenhum seed cadastrado.')
    return
  }

  const toRun = await showMenu(seeds, history)

  if (toRun.length === 0) {
    console.log('→ Seeds ignorados.')
    return
  }

  for (const seed of toRun) {
    await executeSeed(seed)
  }

  console.log(`\n✓ ${toRun.length} seed(s) executado(s).`)
}

main()
  .catch((err) => {
    showCursor()
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
