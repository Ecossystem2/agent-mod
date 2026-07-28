# 0002 — Retenção de AuditEvent

**Data:** 2026-06-19
**Status:** accepted

## Contexto

O template registra auditoria de negócio (quem fez o quê, em qual recurso) na tabela `audit_events`, gravada **inline no mesmo `$transaction`** da mutação que a originou (não há mais o port `AuditEventRepository` — auditoria não é um agregado separado, é efeito colateral atômico da operação). Os tipos `AuditEventInput` permanecem como contrato dos métodos de repositório que aceitam metadados de auditoria.

`audit_events` é uma tabela **append-only que cresce sem teto**. Sem estratégia de retenção, ela vira o maior objeto do banco, degrada queries de leitura de auditoria e infla backups. Por outro lado, definir uma janela de retenção (quantos meses guardar, se arquiva ou apaga) é uma **decisão de compliance/negócio** que pertence ao projeto derivado, não ao template.

## Decisão

O template entrega os **trilhos** para retenção, mas **não** inclui job de limpeza:

1. **Índices prontos** no schema (`apps/api/prisma/schema.prisma`, model `AuditEvent`):
   - `@@index([createdAt])` — sweep por janela temporal (archive/delete por data).
   - `@@index([actorUserId, createdAt])` — consulta de auditoria por ator no tempo.
   - `@@index([resourceType, resourceId])` — consulta por recurso.

2. **Estratégia documentada como trilho**, escolhida pelo projeto derivado:
   - **Particionamento por mês** (`PARTITION BY RANGE (createdAt)`) — `DROP PARTITION` de meses antigos é instantâneo e não gera bloat; preferível em volume alto.
   - **Job de archive + delete** — BullMQ recorrente que move linhas além da janela para storage frio (S3/tabela de arquivo) e remove do hot path. Reusa o padrão de jobs/DLQ do template.

3. **Sem job de limpeza no template** — a janela de retenção e a escolha entre partição vs archive são deixadas para o projeto, conscientemente. Nenhum `DELETE` automático embarcado.

## Alternativas consideradas

- **Embarcar um job de purge com janela fixa (ex: 90 dias)** — descartada: retenção de auditoria é requisito de compliance específico de cada produto; um default errado apaga evidência legal silenciosamente.
- **Não indexar `createdAt`** — descartada: sem ele qualquer sweep por data faz full scan, inviabilizando archive eficiente.

## Consequências

- **Positivas:** projeto derivado pluga retenção sem alterar schema (índices já existem); duas estratégias claras documentadas; zero risco de apagar auditoria por default do template.
- **Negativas:** template entregue sem retenção ativa — se o projeto esquecer de implementar, a tabela cresce sem limite. É uma dívida explícita, não silenciosa.
- **Riscos:** projeto que escolher delete sem archive perde auditoria histórica permanentemente. Documentar a janela escolhida em ADR do próprio projeto.

## Referências

- `apps/api/prisma/schema.prisma` (model `AuditEvent`)
- `apps/api/src/domain/application/use-cases/roles/update-role-use-case.ts` (auditoria inline no transaction)
- `apps/api/src/domain/application/use-cases/users/set-user-password-use-case.ts`
- [Database](../../infra/database.md)
