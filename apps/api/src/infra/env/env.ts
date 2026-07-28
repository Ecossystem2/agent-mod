import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  REDIS_URL: z.string().url(),

  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET precisa ter pelo menos 32 chars (32 bytes base64)'),
  AUTH_BASE_URL: z.string().url(),
  AUTH_TRUSTED_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  SECURE_COOKIES: z
    .string()
    .default('false')
    .transform((s) => s === 'true'),
  AUTH_COOKIE_DOMAIN: z.string().optional(),

  AUTH_RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),

  PERMISSIONS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  TRUST_PROXY: z.coerce.number().int().min(0).default(1),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  THROTTLE_IP_LIMIT: z.coerce.number().int().positive().default(1000),

  STORAGE_DRIVER: z.enum(['disk', 's3', 'r2']).default('disk'),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().url().optional(),

  MAIL_ENABLED: z
    .string()
    .default('false')
    .transform((s) => s === 'true'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((s) => s === 'true'),

  WEBHOOK_SECRET: z.string().min(16).optional(),

  BULL_BOARD_PATH: z.string().default('/admin/queues'),
  BULL_BOARD_ENABLED: z
    .string()
    .default('false')
    .transform((s) => s === 'true'),
  BULL_BOARD_USER: z.string().default('admin'),
  BULL_BOARD_PASS: z.string().min(12).optional(),
}).superRefine((data, ctx) => {
  const isDeployed = data.NODE_ENV === 'production' || data.NODE_ENV === 'staging'
  if (data.NODE_ENV === 'production' && !data.SECURE_COOKIES) {
    ctx.addIssue({ code: 'custom', path: ['SECURE_COOKIES'], message: 'obrigatório true em produção' })
  }
  if (isDeployed && data.AUTH_TRUSTED_ORIGINS.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['AUTH_TRUSTED_ORIGINS'], message: 'obrigatório em produção/staging' })
  }
  if (isDeployed && data.CORS_ALLOWED_ORIGINS.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['CORS_ALLOWED_ORIGINS'], message: 'obrigatório em produção/staging' })
  }
  if (data.BULL_BOARD_ENABLED && !data.BULL_BOARD_PASS) {
    ctx.addIssue({ code: 'custom', path: ['BULL_BOARD_PASS'], message: 'obrigatório quando BULL_BOARD_ENABLED=true' })
  }
  if (data.MAIL_ENABLED) {
    if (!data.SMTP_HOST) {
      ctx.addIssue({ code: 'custom', path: ['SMTP_HOST'], message: 'obrigatório quando MAIL_ENABLED=true' })
    }
    if (!data.SMTP_PORT) {
      ctx.addIssue({ code: 'custom', path: ['SMTP_PORT'], message: 'obrigatório quando MAIL_ENABLED=true' })
    }
    if (!data.SMTP_FROM) {
      ctx.addIssue({ code: 'custom', path: ['SMTP_FROM'], message: 'obrigatório quando MAIL_ENABLED=true' })
    }
  }
  if (data.STORAGE_DRIVER === 's3' && !data.STORAGE_BUCKET) {
    ctx.addIssue({ code: 'custom', path: ['STORAGE_BUCKET'], message: 'obrigatório quando STORAGE_DRIVER=s3' })
  }
})

export type Env = z.infer<typeof envSchema>
