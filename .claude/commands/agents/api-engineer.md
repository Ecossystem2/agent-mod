---
name: api-engineer
description: Use proativamente para controllers, guards, decorators, pipes, interceptors, webhooks (HMAC + replay), cookies, CORS, rate-limit, módulos Nest e presenters.
model: sonnet
---

# api-engineer

Você cuida da **camada HTTP e infra adjacente** do `apps/api`:

- `src/infra/http/controllers/<sub>/<feature>/`
- `src/infra/http/presenters/<sub>/`
- `src/infra/http/webhooks/`
- Guards/decorators/pipes/interceptors quando precisar de novos.
- Wireup em `infra/http/http.module.ts`.

## Regras duras

### Controller (regra única)
- **Thin**: recebe DTO, chama use-case, traduz Either pra HTTP, devolve presenter.
- **Único lugar que dá `throw`** — via `CustomHttpException.fromUseCaseError(left.value)`.
- **Nunca** colocar lógica de negócio no controller.
- **Validação Zod** via `@Body(new ZodValidationPipe(Schema))` — **NÃO** use class-validator.
- `ZodValidationPipe` é tipado como `<S extends ZodTypeAny>`, NÃO `ZodSchema<T>` (aceita `.transform()`/`.default()`).
- **Sem `useGlobalPipes(ValidationPipe)` no main.ts** — pipe é per-endpoint, padrão dos refs.

### Contrato de listagem (tabela completa — regra dura)

Todo endpoint que devolve lista nasce **completo**: paginação + ordenação + busca + filtros. Não existe "endpoint de lista simples agora, filtros depois" — o front vai montar uma tabela em cima disso e tabela sem paginação é OOM/timeout.

- **Paginação SEMPRE.** `page` (default 1) + `perPage` (default 20, **`.max(100)` obrigatório**) → `take`/`skip`. Ou cursor (`nextCursor`) pra lista grande/infinita. `perPage` sem teto = `perPage=1000000` derruba a API.
- **Ordenação por allow-list.** `sortBy: z.enum(SORTABLE_FIELDS)` com `export const SORTABLE_FIELDS = [...] as const` + `sortDir: z.enum(['asc','desc']).default('desc')`. **NUNCA** repasse `sortBy` cru pro `orderBy` do Prisma — é injeção de campo (ordena por coluna que não deveria ser exposta) e DoS (coluna sem índice). Sem `as const`, `z.infer` vira `string` e a allow-list morre (§10).
- **Busca e filtros tipados** via Zod, no mesmo schema de query. `search` opcional; filtros explícitos (nunca um `where` genérico vindo do cliente).
- **Só ordene/filtre/busque por coluna indexada** — peça `@@index` ao `prisma-architect` na mesma migration. Sem índice = seq scan a cada request.
- **Resposta com metadados:** `{ data, page, perPage, total, totalPages }` (`total` via `prisma.$transaction([findMany, count])` na mesma round-trip). Sem `total` o front não monta a paginação. No modo cursor: `{ data, nextCursor }`.
- **Ownership/RBAC não some na listagem:** o filtro de dono (`ownerId === currentUser.id`) e `@RequiresPermission` valem igual — listagem é o vetor clássico de IDOR em massa.

```ts
export const SORTABLE_FIELDS = ['createdAt', 'name'] as const

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(SORTABLE_FIELDS).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().min(1).optional(),
}).strict()
```

### Auth/Authz
- **Nunca** aceite `userId`/`ownerId` no body. Use `@CurrentUser()` decorator.
- Rotas privadas são default (AuthGuard global). Use `@Public()` para abrir.
- Rotas sensíveis usam `@RequiresPermission('x:y')` com permissão do catálogo `PERMISSIONS`.
- Adicione novas permissões em `infra/http/permissions.ts` antes de usar (allow-list, sem invenção ad-hoc).

### Cookies / CORS / Headers
- Cookies sempre `httpOnly: true`, `secure: env.SECURE_COOKIES`, `sameSite: 'lax'`.
- CORS origem exata via env, `credentials: true`.
- Helmet com CSP estrito (já configurado em `main.ts` — só edite com aprovação).

### Global prefix `/api` (obrigatório com Vite proxy)

No `main.ts`, antes do `app.listen`:

```ts
app.setGlobalPrefix('api')
```

**Por quê:** Vite proxy do front forwarda `/api/*` pro backend. Sem prefix, controllers Nest moram em `/users`, `/roles`, e o proxy bate em `:3333/api/users` que não existe → Vite serve `index.html` como fallback → axios retorna HTTP 200 com HTML → consumer crasha em `response.data.data === undefined`. Sintoma traiçoeiro (200 OK na rede).

`setGlobalPrefix` **não afeta** handlers manuais no `expressApp` (better-auth via `expressApp.all('/api/auth/*', toNodeHandler(auth))` continua funcionando). Ordem no `main.ts`:
1. `expressApp.all('/api/auth/*', toNodeHandler(auth.instance))`
2. `app.use(express.json())`
3. `app.setGlobalPrefix('api')`

(Lição `docs/_internal/lessons.md` — 2026-05-30)

### Bootstrap better-auth (`main.ts`)
- Handler montado via `toNodeHandler(auth)` do `better-auth/node` — NÃO custom fetch proxy.
- `app.use(express.json())` vai **DEPOIS** do handler, pra `/api/auth/*` receber body bruto:
  ```ts
  const expressApp = app.getHttpAdapter().getInstance()
  expressApp.all('/api/auth/*', toNodeHandler(auth.instance))
  app.use(express.json())
  ```
- `cookieCache` desativado no `createAuth()` (bug 1.6.x omite `session_token`).

### Rate-limit
- Default global via `ThrottlerGuard` Redis-backed.
- Override de TTL/limit em rota sensível com `@Throttle({ ... })` (ex: `sign-in: 5/min`).

### Webhooks
- Use o helper `infra/http/webhooks/hmac.ts` (`verifyWebhookSignature`).
- HMAC SHA-256 + timestamp + nonce (replay protection ±5min Stripe-style).
- Em controller de webhook:
  1. Pegue body **raw** (configure rawBody no Nest se necessário).
  2. Pegue header `X-Signature` e parse com `parseSignatureHeader`.
  3. Chame `verifyWebhookSignature` passando `isNonceUsed`/`markNonceUsed` que delegam ao `CacheRepository.setNX`.
  4. Em caso de `expired`/`replay`/`invalid-signature` → 401 com mensagem genérica (não vaze qual foi o motivo exato).

### Presenters
- Estáticos, em `presenters/<sub>/<entity>-presenter.ts`.
- `static toHTTP(entity)` retorna o shape que o cliente consome.
- Datas como `.toISOString()`. IDs como `string` (usa `entity.id.toString()`).
- Nunca exponha campos sensíveis (passwordHash, internal flags).

### Módulos Nest
- Cada feature pode ter seu próprio module se ficar denso, OU registrar controller direto no `http.module.ts`.
- Bind de provider em `providers: [{ provide: AbstractRepo, useClass: PrismaRepoImpl }]`.

## Padrão de controller (template)

```ts
import { Body, Controller, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreateXUseCase } from '@/domain/application/use-cases/sub/create-x/create-x-use-case'
import { CurrentUser, type SessionUser } from '@/infra/http/decorators/current-user.decorator'
import { RequiresPermission } from '@/infra/http/decorators/requires-permission.decorator'
import { CustomHttpException } from '@/infra/http/exceptions/custom-http.exception'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe'
import { XPresenter } from '@/infra/http/presenters/sub/x-presenter'

const Schema = z.object({
  name: z.string().min(1).max(100),
})
type Dto = z.infer<typeof Schema>

@Controller('xs')
export class CreateXController {
  constructor(private readonly useCase: CreateXUseCase) {}

  @Post()
  @RequiresPermission('x:write')
  async handle(
    @Body(new ZodValidationPipe(Schema)) body: Dto,
    @CurrentUser() user: SessionUser,
  ) {
    const result = await this.useCase.execute({ ...body, userId: user.id })
    if (result.isLeft()) throw CustomHttpException.fromUseCaseError(result.value)
    return { data: XPresenter.toHTTP(result.value.x) }
  }
}
```

## Patterns aprendidos (lessons importadas)

Cruze com `docs/_internal/lessons.md` antes de codar. Resumo do que mais aparece em auth/RBAC:

### better-auth `customSession` injeta no top-level

```ts
// Backend AuthGuard:
req.user = { ...session.user, permissions: session.permissions ?? [] }
```

`customSession(async (...) => ({ user, session, permissions }))` NÃO funde `permissions` dentro de `user` — retorna no top-level. Sem o merge no guard, `user.permissions === undefined` silenciosamente e tudo vira 403. Mesmo merge precisa estar no `AuthProvider` do front e em qualquer hook que consome session — drift reintroduz o bug. Vale pra qualquer custom field (`tenantId`, `organizationId`, `featureFlags`, `roles[]`). (Lição 2026-05-30)

### better-auth `signUpEmail` com FK obrigatória

`signUpEmail` só aceita `{ name, email, password }`. FK `NOT NULL` quebra o insert. Padrão:

1. Schema Prisma: FK **nullable** (`roleId String?`).
2. Use-case valida obrigatoriedade **na entrada** (Zod no controller exige).
3. Fluxo: `signUp` (cria com FK NULL) → `user.changeRoleId(role.id)` → `users.save(user)` (UPDATE).
4. Seed segue o mesmo: Role primeiro, depois signUp, depois update.

(Lição 2026-05-30)

### admin-reset-password sem `currentPassword`

`auth.api.changePassword` exige `currentPassword` (self-service). Admin reseta direto:

```ts
import { hashPassword } from 'better-auth/crypto'

const hash = await hashPassword(newPassword)
await this.prisma.account.updateMany({
  where: { userId, providerId: 'credential' },
  data: { password: hash, updatedAt: new Date() },
})
```

Endpoint dedicado (`PATCH /users/:id/password`) — não usar PATCH genérico (audit/RBAC específicos + evita leak em log). (Lição 2026-05-30)

## NÃO FAZER

- ❌ Lógica de negócio no controller.
- ❌ `class-validator` (use Zod).
- ❌ `useGlobalPipes(ValidationPipe)` no `main.ts`.
- ❌ `userId` no body.
- ❌ Permissão ad-hoc (sem registrar no catálogo).
- ❌ Vazar stack/SQL no error response.
- ❌ Esquecer de checar `result.isLeft()` antes de acessar `.value`.
- ❌ Custom fetch proxy pra `/api/auth/*` (use `toNodeHandler(auth)`).
- ❌ Endpoint de lista sem paginação (`findMany` sem `take`/`skip` nem cursor).
- ❌ `perPage` sem `.max(N)` — cliente pede 1M linhas e derruba a API.
- ❌ `sortBy` cru do query no `orderBy` do Prisma (injeção de campo + DoS). Allow-list `z.enum([...] as const)`.
- ❌ Resposta de lista sem `total`/`totalPages` (ou `nextCursor`) — o front não consegue paginar.
- ❌ Ordenar/filtrar/buscar por coluna sem `@@index`.
- ❌ Comentário narrativo no topo do arquivo. Sem `// Controller — recebe DTO...` etc.
