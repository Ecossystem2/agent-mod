import { describe, expect, it } from 'vitest'

import { envSchema } from './env'

function baseEnv(): Record<string, string> {
  return {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_BASE_URL: 'http://localhost:3333',
  }
}

describe('envSchema', () => {
  it('aplica defaults nos campos opcionais', () => {
    const sut = envSchema.parse(baseEnv())

    expect(sut.NODE_ENV).toBe('development')
    expect(sut.PORT).toBe(3333)
    expect(sut.LOG_LEVEL).toBe('info')
    expect(sut.TRUST_PROXY).toBe(1)
    expect(sut.THROTTLE_TTL_SECONDS).toBe(60)
    expect(sut.THROTTLE_LIMIT).toBe(100)
    expect(sut.THROTTLE_IP_LIMIT).toBe(1000)
    expect(sut.STORAGE_DRIVER).toBe('disk')
    expect(sut.BULL_BOARD_PATH).toBe('/admin/queues')
  })

  it('coage PORT numérico a partir de string', () => {
    const sut = envSchema.parse({ ...baseEnv(), PORT: '8080' })

    expect(sut.PORT).toBe(8080)
  })

  it('transforma CSV de origens em array filtrado', () => {
    const sut = envSchema.parse({
      ...baseEnv(),
      AUTH_TRUSTED_ORIGINS: 'https://a.com, https://b.com ,',
      CORS_ALLOWED_ORIGINS: 'https://c.com',
    })

    expect(sut.AUTH_TRUSTED_ORIGINS).toEqual(['https://a.com', 'https://b.com'])
    expect(sut.CORS_ALLOWED_ORIGINS).toEqual(['https://c.com'])
  })

  it('usa array vazio quando origens não são fornecidas', () => {
    const sut = envSchema.parse(baseEnv())

    expect(sut.AUTH_TRUSTED_ORIGINS).toEqual([])
    expect(sut.CORS_ALLOWED_ORIGINS).toEqual([])
  })

  it('transforma flags booleanas string em boolean', () => {
    const enabled = envSchema.parse({
      ...baseEnv(),
      SECURE_COOKIES: 'true',
      MAIL_ENABLED: 'true',
      SMTP_SECURE: 'true',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_FROM: 'no-reply@example.com',
    })
    const disabled = envSchema.parse(baseEnv())

    expect(enabled.SECURE_COOKIES).toBe(true)
    expect(enabled.MAIL_ENABLED).toBe(true)
    expect(enabled.SMTP_SECURE).toBe(true)
    expect(disabled.SECURE_COOKIES).toBe(false)
    expect(disabled.MAIL_ENABLED).toBe(false)
    expect(disabled.SMTP_SECURE).toBe(false)
  })

  it('aceita AUTH_COOKIE_DOMAIN opcional e mantém undefined por padrão', () => {
    const withDomain = envSchema.parse({ ...baseEnv(), AUTH_COOKIE_DOMAIN: '.example.com' })
    const withoutDomain = envSchema.parse(baseEnv())

    expect(withDomain.AUTH_COOKIE_DOMAIN).toBe('.example.com')
    expect(withoutDomain.AUTH_COOKIE_DOMAIN).toBeUndefined()
  })

  it('rejeita AUTH_SECRET com menos de 32 chars', () => {
    expect(() => envSchema.parse({ ...baseEnv(), AUTH_SECRET: 'short' })).toThrow()
  })

  it('rejeita DATABASE_URL inválida', () => {
    expect(() => envSchema.parse({ ...baseEnv(), DATABASE_URL: 'not-a-url' })).toThrow()
  })

  it('rejeita NODE_ENV fora do enum', () => {
    expect(() => envSchema.parse({ ...baseEnv(), NODE_ENV: 'qa' })).toThrow()
  })

  it('rejeita em produção sem SECURE_COOKIES, AUTH_TRUSTED_ORIGINS e CORS_ALLOWED_ORIGINS', () => {
    expect(() =>
      envSchema.parse({ ...baseEnv(), NODE_ENV: 'production' }),
    ).toThrow()
  })

  it('aceita configuração de produção válida', () => {
    const sut = envSchema.parse({
      ...baseEnv(),
      NODE_ENV: 'production',
      SECURE_COOKIES: 'true',
      AUTH_TRUSTED_ORIGINS: 'https://app.example.com',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
    })

    expect(sut.NODE_ENV).toBe('production')
    expect(sut.SECURE_COOKIES).toBe(true)
  })

  it('rejeita em staging sem AUTH_TRUSTED_ORIGINS e CORS_ALLOWED_ORIGINS', () => {
    expect(() =>
      envSchema.parse({ ...baseEnv(), NODE_ENV: 'staging' }),
    ).toThrow()
  })

  it('aceita configuração de staging válida sem exigir SECURE_COOKIES', () => {
    const sut = envSchema.parse({
      ...baseEnv(),
      NODE_ENV: 'staging',
      AUTH_TRUSTED_ORIGINS: 'https://staging.example.com',
      CORS_ALLOWED_ORIGINS: 'https://staging.example.com',
    })

    expect(sut.NODE_ENV).toBe('staging')
    expect(sut.SECURE_COOKIES).toBe(false)
  })

  it('rejeita BULL_BOARD_ENABLED sem BULL_BOARD_PASS', () => {
    expect(() =>
      envSchema.parse({ ...baseEnv(), BULL_BOARD_ENABLED: 'true' }),
    ).toThrow()
  })

  it('aceita BULL_BOARD_ENABLED com BULL_BOARD_PASS válido', () => {
    const sut = envSchema.parse({
      ...baseEnv(),
      BULL_BOARD_ENABLED: 'true',
      BULL_BOARD_PASS: 'senhaforte123',
    })

    expect(sut.BULL_BOARD_ENABLED).toBe(true)
  })

  it('aceita campos opcionais de storage e smtp', () => {
    const sut = envSchema.parse({
      ...baseEnv(),
      STORAGE_DRIVER: 's3',
      STORAGE_BUCKET: 'bucket',
      STORAGE_ENDPOINT: 'https://s3.example.com',
      STORAGE_PUBLIC_URL: 'https://cdn.example.com',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      WEBHOOK_SECRET: '0123456789abcdef',
    })

    expect(sut.STORAGE_DRIVER).toBe('s3')
    expect(sut.STORAGE_BUCKET).toBe('bucket')
    expect(sut.SMTP_PORT).toBe(587)
    expect(sut.WEBHOOK_SECRET).toBe('0123456789abcdef')
  })

  it('aplica default 300 em PERMISSIONS_CACHE_TTL_SECONDS', () => {
    const sut = envSchema.parse(baseEnv())

    expect(sut.PERMISSIONS_CACHE_TTL_SECONDS).toBe(300)
  })

  it('coage PERMISSIONS_CACHE_TTL_SECONDS a partir de string', () => {
    const sut = envSchema.parse({ ...baseEnv(), PERMISSIONS_CACHE_TTL_SECONDS: '600' })

    expect(sut.PERMISSIONS_CACHE_TTL_SECONDS).toBe(600)
  })

  it('rejeita MAIL_ENABLED=true sem SMTP_HOST/PORT/FROM', () => {
    expect(() => envSchema.parse({ ...baseEnv(), MAIL_ENABLED: 'true' })).toThrow()
  })

  it('aceita MAIL_ENABLED=true com SMTP_HOST/PORT/FROM', () => {
    const sut = envSchema.parse({
      ...baseEnv(),
      MAIL_ENABLED: 'true',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_FROM: 'no-reply@example.com',
    })

    expect(sut.MAIL_ENABLED).toBe(true)
    expect(sut.SMTP_FROM).toBe('no-reply@example.com')
  })

  it('rejeita STORAGE_DRIVER=s3 sem STORAGE_BUCKET', () => {
    expect(() => envSchema.parse({ ...baseEnv(), STORAGE_DRIVER: 's3' })).toThrow()
  })
})
