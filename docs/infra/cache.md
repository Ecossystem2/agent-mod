# Cache

Port em `domain/application/cache/cache-repository.ts`, impl Redis em `infra/`. TTL **sempre** parametrizado por env — nunca hardcode.

## Cache de permissões

Permissões efetivas de um usuário são cacheadas para evitar recomputar o join role→permission a cada request do `PermissionGuard`.

| Item | Valor |
|---|---|
| Convenção | `domain/application/cache/permissions-cache.ts` |
| Chave | `permissions:user:<id>` (`permissionsCacheKey(userId)`) |
| Prefixo | `PERMISSIONS_CACHE_PREFIX = 'permissions:user:'` |
| Padrão de invalidação | `PERMISSIONS_CACHE_PATTERN = 'permissions:user:*'` |
| TTL | env `PERMISSIONS_CACHE_TTL_SECONDS` (default 300) |

## Invalidação por mutação

Todo use-case que altera papéis, atribuições ou remove usuário invalida o cache na **mesma operação**, via `cache.invalidateByPattern(PERMISSIONS_CACHE_PATTERN)`. Cache stale pós-mutação é bug silencioso.

Use-cases que invalidam: `update-role`, `delete-role`, e mutações de assignment/delete-user.

```ts
await this.roles.save(role, { /* audit inline */ })
await this.cache.invalidateByPattern(PERMISSIONS_CACHE_PATTERN)
```
