# Restauração de backup (Restic / B2)

Procedimento para restaurar a partir dos snapshots gerados por `backup-restic.sh`.
Os snapshots têm tags: `db` (dump `pg_dumpall`) e `uploads` (tar dos uploads).

> ⚠️ Restaurar o banco **sobrescreve** dados. Faça num ambiente controlado e
> confirme a cor/ambiente antes de aplicar em produção.

## 0. Pré-requisitos

Na máquina onde vai restaurar:

```bash
# credenciais (mesmas do backup)
export $(grep -v '^#' infra/backup/b2-credentials.env | xargs)
restic snapshots          # lista snapshots; confirme acesso ao repo
```

## 1. Escolher o snapshot

```bash
restic snapshots --tag db          # snapshots do banco
restic snapshots --tag uploads     # snapshots de uploads
# anote o ID curto do snapshot desejado (ex.: 1a2b3c4d)
```

## 2. Restaurar o banco (pg_dumpall)

O dump foi salvo via stdin com o nome lógico `pgdumpall.sql`. Recupere pelo stdout
do restic e aplique direto no container do Postgres:

```bash
# stream do dump → psql dentro do container
restic dump <SNAPSHOT_ID> pgdumpall.sql \
  | docker exec -i apps-postgres psql -U postgres
```

> `pg_dumpall` inclui os `CREATE DATABASE`/roles, então o `psql` reconstrói tudo.
> Se quiser começar limpo, recrie o container/volume do Postgres antes:
> `docker compose -f docker-compose.shared.yml down -v postgres && ... up -d postgres`.

## 3. Restaurar uploads (se aplicável)

```bash
restic dump <SNAPSHOT_ID> uploads.tar \
  | tar -C /caminho/destino/uploads -xf -
```

## 4. Verificar

```bash
# integridade do repo (não dos dados restaurados)
restic check

# sanidade da aplicação após restaurar
curl -fsS http://localhost/api/health
```

## 5. Restauração parcial / inspeção

Montar o repositório como FUSE pra navegar sem extrair tudo:

```bash
mkdir -p /mnt/restic && restic mount /mnt/restic
# navegue em /mnt/restic/snapshots/<...>; Ctrl-C pra desmontar
```

## Notas

- A `RESTIC_PASSWORD` é **indispensável**: sem ela o repositório é irrecuperável.
  Guarde-a fora da VPS (cofre/gestor de segredos).
- O backup pré-deploy de produção usa o **mesmo** script/repo — então sempre há
  um snapshot recente imediatamente antes de cada release.
