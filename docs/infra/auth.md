# Auth

better-auth roda **fora** do pipeline Nest (`toNodeHandler`), então `ThrottlerGuard` não alcança `/api/auth/*`. A proteção contra força-bruta é feita por middleware Express **antes** do handler.

## Lockout de sign-in

`createSignInLockoutMiddleware` (`infra/auth/sign-in-lockout.middleware.ts`) é montado antes do `toNodeHandler`. Fluxo por request de sign-in:

1. Extrai `email` do body, normalizado `.toLowerCase().trim()` (evita bypass por casing na chave Redis).
2. Se `lockout.isBlocked(email)` → `429 too_many_attempts`.
3. No `finish` da resposta: sucesso (`2xx`) → `lockout.clear(email)`; falha → `lockout.registerFailure(email)`.
4. Falha ao parsear o body é logada e retorna `400` (não silenciosa).

O `SignInLockoutService` usa storage Redis; `isBlocked` é efetivamente invocado (sem dead security code). Rate-limit adicional do better-auth via `secondaryStorage` Redis.

## Rate-limit (ThrottlerGuard)

Dois throttlers nomeados (`http.module.ts`), Redis-backed, aplicados a TODA rota do pipeline Nest (não a `/api/auth/*`, que vive fora — ver lockout acima):

- **`default`** (`identityTracker`): chave `sess:<sha256(cookie *session_token)>` quando há sessão, senão `ip:<req.ip>`. Balde **por usuário** — não colapsa em contador global atrás de BFF/NAT nem pune usuários que compartilham IP. O guard roda antes do `AuthGuard`, então lê o cookie do header (não `req.user`). O token nunca é logado; só o hash vira chave.
- **`ip`** (`ipTracker`): sempre `ip:<req.ip>`, teto `THROTTLE_IP_LIMIT` (default `1000`). Backstop que impede furar o `default` rotacionando um cookie `*session_token` forjado.

Funções de tracking puras em `infra/http/throttler/throttler-trackers.ts`. Chave nunca é vazia (fallback `ip:unknown`).

**Atrás de IP compartilhado** (BFF sem repassar IP real), o backstop `ip` vira teto **global de volume**, não por-cliente. Pra recuperar o bounding por-cliente nesse deploy: firewall da origem liberando só ranges do CDN + repassar o IP real via header confiável env-gated (ex: `CF-Connecting-IP`, sobrescrito pelo CDN a cada request — diferente do XFF appendável). Hop-counting com `trust proxy: N` é frágil/spoofável e **não** é a abordagem recomendada.

## Cookies

`httpOnly: true`, `secure: env.SECURE_COOKIES` (obrigatório `true` em produção), `sameSite: 'lax'`. Host-only por padrão; `AUTH_COOKIE_DOMAIN=.example.com` quando API e front vivem em subdomínios do mesmo apex.

## Permissões

RBAC por allow-list (`PERMISSIONS` + `@RequiresPermission()` + `PermissionGuard`). Permissões efetivas são cacheadas — ver [cache](cache.md). Guard nega acesso (`false`) quando `permissions` vem `undefined`, nunca libera com lista vazia.

## Auditoria de operação

`set-password` grava `account.update` + `auditEvent.create` no **mesmo `$transaction`** — ver [database](database.md). Auditoria de negócio é inline no transaction da mutação, não port separado.
