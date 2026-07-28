# Docs

Índice navegável da documentação canônica. O código é a verdade; estas páginas registram contrato, decisão e comportamento que o código sozinho não explica.

## Para começar

- [Configuração do projeto](PROJECT.md) — preencher via `/setup` antes da primeira task
- [Guia de migração](migration-guide.md) — atualizar projetos baseados em versões antigas do template

## Arquitetura

- [Paginação](architecture/pagination.md) — cursor (keyset) vs offset
- [ADRs](architecture/decisions/)
  - [0001 — Paginação por cursor](architecture/decisions/0001-paginacao-cursor.md)
  - [0002 — Retenção de AuditEvent](architecture/decisions/0002-retencao-audit-event.md)

## Infra

- [Auth](infra/auth.md) — lockout de sign-in, cookies, RBAC, auditoria de operação
- [Cache](infra/cache.md) — cache de permissões, TTL por env, invalidação por mutação
- [Database](infra/database.md) — índices, auditoria inline no transaction, retenção

## Workflows

- [Documentation standards](workflows/documentation-standards.md)
