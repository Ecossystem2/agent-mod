import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const connectMock = vi.fn()
const disconnectMock = vi.fn()
const poolMock = vi.fn()
const prismaPgMock = vi.fn()
const superMock = vi.fn()

vi.mock('pg', () => ({
  Pool: class {
    constructor(config: unknown) {
      poolMock(config)
    }
  },
}))

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(pool: unknown, options?: unknown) {
      prismaPgMock(pool, options)
    }
  },
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $connect = connectMock
    $disconnect = disconnectMock
    constructor(options: unknown) {
      superMock(options)
    }
  },
}))

const { PrismaService } = await import('./prisma.service')

describe('PrismaService', () => {
  const originalUrl = process.env.DATABASE_URL
  const originalPoolMax = process.env.DB_POOL_MAX

  beforeEach(() => {
    connectMock.mockReset().mockResolvedValue(undefined)
    disconnectMock.mockReset().mockResolvedValue(undefined)
    poolMock.mockReset()
    prismaPgMock.mockReset()
    superMock.mockReset()
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db'
    delete process.env.DB_POOL_MAX
  })

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl
    if (originalPoolMax === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = originalPoolMax
  })

  it('lança quando DATABASE_URL não está definida', () => {
    delete process.env.DATABASE_URL

    expect(() => {
      new PrismaService()
    }).toThrow('DATABASE_URL environment variable is required')
  })

  it('cria o pool e o adapter a partir da DATABASE_URL', () => {
    new PrismaService()

    expect(poolMock).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@localhost:5432/db',
      max: 10,
    })
    expect(prismaPgMock).toHaveBeenCalledOnce()
    expect(superMock).toHaveBeenCalledWith(expect.objectContaining({ adapter: expect.anything() }))
  })

  it('usa DB_POOL_MAX do env quando definido', () => {
    process.env.DB_POOL_MAX = '25'

    new PrismaService()

    expect(poolMock).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@localhost:5432/db',
      max: 25,
    })
  })

  it('passa o schema ao adapter quando a DATABASE_URL tem ?schema', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db?schema=e2e_abc'

    new PrismaService()

    expect(poolMock).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@localhost:5432/db?schema=e2e_abc',
      max: 10,
    })
    expect(prismaPgMock).toHaveBeenCalledWith(expect.anything(), { schema: 'e2e_abc' })
  })

  it('onModuleInit conecta', async () => {
    const sut = new PrismaService()

    await sut.onModuleInit()

    expect(connectMock).toHaveBeenCalledOnce()
  })

  it('onModuleDestroy desconecta', async () => {
    const sut = new PrismaService()

    await sut.onModuleDestroy()

    expect(disconnectMock).toHaveBeenCalledOnce()
  })
})
