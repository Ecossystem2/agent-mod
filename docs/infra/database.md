# Database

Prisma + Postgres 16. Schema em `apps/api/prisma/schema.prisma`. Pool via `DB_POOL_MAX` (default 10).

## Índices

Coluna usada em `WHERE`, `ORDER BY` ou `JOIN` recebe `@@index` na mesma migration. Índices presentes nas tabelas administrativas:

| Tabela | Índice | Motivo |
|---|---|---|
| `users` | `[name]` | busca/ordenação por nome |
| `roles` | `[name]` | busca/ordenação por nome |
| `user_role_assignments` | `[userId]`, `[roleId]` | join nos dois sentidos (FK sem índice = N+1) |
| `audit_events` | `[createdAt]`, `[actorUserId, createdAt]`, `[resourceType, resourceId]` | retenção por data + consulta por ator/recurso |

## Auditoria

`audit_events` é gravada **inline no mesmo `$transaction`** da mutação que a originou — auditoria de negócio é efeito colateral atômico, não agregado separado. Não há port `AuditEventRepository`; o repositório da entidade aceita um `AuditEventInput` no método de escrita e grava ambos no transaction.

Distinção: `actorUserId` (quem agiu, vai no audit) vs `authUserId` (sujeito do filtro). Não confundir com o `SecurityAuditInterceptor`, que loga metadados HTTP (latência/status/path) — operação, não negócio.

Retenção (partição por mês ou job de archive) é trilho deixado para o projeto derivado — ver [ADR 0002](../architecture/decisions/0002-retencao-audit-event.md).
