# Backup (Restic + Backblaze B2)

Estratégia de backup **adaptada a containers**: o Postgres não roda no host, então
o dump sai via `docker exec` no container `apps-postgres` e é enviado ao
[Restic](https://restic.net/) por STDIN (sem arquivo intermediário). Destino:
um bucket no Backblaze B2.

Arquivos em `infra/backup/`:

| Arquivo                      | Papel                                                          |
| ---------------------------- | -------------------------------------------------------------- |
| `backup-restic.sh`           | script do backup (dump + uploads → restic → retenção → check)  |
| `restic-backup.service`      | unidade systemd (oneshot) que roda o script                    |
| `restic-backup.timer`        | dispara o service diariamente às 03:00                         |
| `b2-credentials.env.example` | credenciais (copie p/ `b2-credentials.env`, **não commitado**) |
| `restore.md`                 | procedimento de restauração                                    |

## O que entra no backup

1. **Banco** — `pg_dumpall` (inclui roles + todos os DBs) via `docker exec`, tag `db`.
2. **Uploads/volumes** — `tar` de `UPLOADS_DIR` (opcional; pulado se não definido), tag `uploads`.

## Quando roda

- **Diário** às 03:00 (host) via `restic-backup.timer`
  (`RandomizedDelaySec=900` espalha a carga; `Persistent=true` recupera execução perdida).
- **Pré-deploy de produção** — o workflow `deploy-production.yml` roda o mesmo
  script quando o último backup bem-sucedido ficou velho demais. Por padrão, o
  deploy força um novo snapshot só se o último sucesso tiver mais de 24h.

## Retenção

`restic forget --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune`, seguido
de `restic check` (integridade). O `prune` recupera espaço no B2.

## Concorrência e erros

- **Lock** (`flock` em `/tmp/restic-backup.lock`) evita backup do timer e do
  pré-deploy rodando ao mesmo tempo.
- **Marcador de sucesso** — o script grava o timestamp do último backup
  bem-sucedido em `/tmp/restic-backup.last-success` (configurável via
  `BACKUP_STATUS_FILE`).
- **Hook de erro** — `BACKUP_NOTIFY_CMD` (opcional) recebe a mensagem de falha;
  ligue a um webhook (Slack/Discord) pra alertar.

## Configuração

Copie e preencha na VPS (nunca commite o arquivo real):

```bash
cp infra/backup/b2-credentials.env.example infra/backup/b2-credentials.env
chmod 600 infra/backup/b2-credentials.env
# preencha RESTIC_REPOSITORY, RESTIC_PASSWORD, B2_ACCOUNT_ID, B2_ACCOUNT_KEY
```

Instale o timer (ajuste `WorkingDirectory`/`ExecStart` no `.service` pro caminho
real do repo):

```bash
sudo cp infra/backup/restic-backup.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now restic-backup.timer
systemctl list-timers restic-backup.timer
```

Detalhes de variáveis no próprio `b2-credentials.env.example`. Passo a passo
completo de setup no [runbook](ci-cd-setup.md).

> ⚠️ A `RESTIC_PASSWORD` criptografa o repositório — **sem ela os backups são
> irrecuperáveis**. Guarde-a também fora da VPS (cofre/gestor de segredos).

## Restauração

Ver [`infra/backup/restore.md`](../../infra/backup/restore.md).
