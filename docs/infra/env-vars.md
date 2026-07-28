# Variáveis de ambiente

Validadas por Zod no boot (`infra/env/env.ts`); erro → `process.exit(1)`. Tabela das variáveis relevantes ao hardening — a lista completa é o `envSchema`.

## Cache

| Var | Default | Descrição |
|---|---|---|
| `PERMISSIONS_CACHE_TTL_SECONDS` | `300` | TTL do cache `permissions:user:<id>`. Ver [cache](cache.md) |

## Pool / banco

| Var | Default | Descrição |
|---|---|---|
| `DB_POOL_MAX` | `10` | `max` do pool Postgres. Explícito — nunca o default implícito do driver |

## Auth

| Var | Default | Descrição |
|---|---|---|
| `SECURE_COOKIES` | `false` | Obrigatório `true` em produção (refine) |
| `AUTH_COOKIE_DOMAIN` | — | Setar `.apex` quando API/front em subdomínios |
| `AUTH_RATE_LIMIT_WINDOW` / `_MAX` | `60` / `5` | Janela e teto do rate-limit de auth |

## Condicionais (superRefine)

Variáveis opcionais que se tornam **obrigatórias** quando a feature é habilitada:

| Gatilho | Exige |
|---|---|
| `MAIL_ENABLED=true` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` |
| `STORAGE_DRIVER=s3` | `STORAGE_BUCKET` |
| `BULL_BOARD_ENABLED=true` | `BULL_BOARD_PASS` (min 12) |
| `NODE_ENV` deployed (prod/staging) | `AUTH_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS` não vazios; `SECURE_COOKIES=true` em prod |

`CORS_ALLOWED_ORIGINS` vazio em prod = `Access-Control-Allow-Origin: *` — por isso é barrado no boot.
