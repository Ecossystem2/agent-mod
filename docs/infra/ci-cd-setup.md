# Runbook — setup de CI/CD

Passo a passo pra plugar a infra real ao sistema de deploy versionado no repo.
Tudo aqui é configuração **manual de uma vez** na VPS / no GitHub. O código (CI,
workflows, scripts, composes, nginx, backup) já está no repo.

> Visão geral do deploy em [`deploy.md`](deploy.md); backup em [`backup.md`](backup.md).

---

## 1. CI (já funciona sem setup)

`.github/workflows/ci.yml` roda em runners GitHub-hosted (`ubuntu-latest`):
lint, typecheck, build, `test-unit` e `test-e2e` separados. O job de e2e roda
apenas quando o diff da PR afeta a stack do backend/infra relevante; o caminho
básico continua funcionando assim que o repo está no GitHub. Os workflows de
deploy de staging e produção constroem as imagens no GitHub-hosted runner e
publicam no GHCR; os runners self-hosted só fazem pull + promote.

O baseline de seguranca roda fora do caminho critico de PR:

- Dependabot abre PRs semanais para as dependências do workspace e `github-actions`;
- `.github/workflows/security-audit.yml` roda semanalmente e manualmente com
  `pnpm audit --prod --audit-level high`;
- o audit nao bloqueia PR comum, para evitar ruido operacional desnecessario.

Para habilitar o Turbo Remote Cache, crie:

- secret `TURBO_TOKEN`
- variable `TURBO_TEAM`

Sem essas credenciais, o CI continua funcionando, mas sem reaproveitar cache remoto.
Em pull requests, o workflow usa `--affected` para executar só o que foi impactado
quando o diff permite.

---

## 2. Registrar os runners self-hosted (staging e produção)

Os workflows de deploy rodam **na VPS** via runner self-hosted (deploy local, sem
SSH). Cada VPS precisa de um runner com a **label** do ambiente.

No GitHub: **Settings → Actions → Runners → New self-hosted runner**, escolha
Linux, e siga os comandos. Ao configurar, adicione a label:

```bash
# na VPS de STAGING
./config.sh --url https://github.com/<org>/<repo> --token <TOKEN> --labels staging
# na VPS de PRODUÇÃO
./config.sh --url https://github.com/<org>/<repo> --token <TOKEN> --labels production
sudo ./svc.sh install && sudo ./svc.sh start   # roda como serviço
```

Os jobs usam `runs-on: [self-hosted, staging]` e `[self-hosted, production]`.

### Pré-requisitos no runner

- Docker + Docker Compose v2 (`docker compose version`).
- Repo clonado / checkout funcional (o workflow faz `actions/checkout`).
- `apps/api/.env` e `apps/web/.env` preenchidos **no diretório de trabalho do runner**
  (não vêm do git — copie de `.env.example` e preencha).
- `curl`, `git`, `restic`, `flock` instalados.
- Para produção: nginx do host instalado + sudo NOPASSWD pro usuário do runner
  nos comandos `nginx -t`, `nginx -s reload` e na criação do symlink (`ln -sfn`).

---

## 3. Secrets / variables no GitHub

O deploy é local na VPS, então a maioria dos segredos vive **na própria VPS**
(arquivos `.env` e `b2-credentials.env`), não no GitHub. No GitHub você só precisa de:

| Tipo                | Nome                    | Uso                                      |
| ------------------- | ----------------------- | ---------------------------------------- |
| Variable (opcional) | `STAGING_BLUE_API_PORT` | porta da API em staging (default `3341`) |
| Secret (opcional)   | `TURBO_TOKEN`           | token do Turbo Remote Cache              |
| Variable (opcional) | `TURBO_TEAM`            | slug da organização/time no Turbo        |

> Não há `SSH_KEY`/`DEPLOY_HOST` porque o runner roda **na** VPS. Mantenha
> `apps/api/.env`, `apps/web/.env`, `deploy.env` e `b2-credentials.env` na VPS,
> fora do git (já ignorados).

As janelas de espera do deploy e a janela do backup pré-deploy vivem em
`deploy.env` na VPS (`POSTGRES_HEALTHCHECK_*`, `POST_SWITCH_HEALTHCHECK_*`,
`HEALTHCHECK_*`, `BACKUP_MAX_AGE_HOURS` e `BACKUP_STATUS_FILE`).
Os nomes das imagens também podem ser parametrizados em `deploy.env`, mas o
workflow já injeta o namespace do GHCR automaticamente quando roda na Actions.

---

## 4. nginx do host (só produção)

Instale os confs e o symlink inicial — ver [`infra/nginx/README.md`](../../infra/nginx/README.md):

```bash
sudo cp infra/nginx/{blue,green}.conf /etc/nginx/sites-available/
# cor inicial (convenção: blue)
sudo ln -sfn /etc/nginx/sites-available/blue.conf /etc/nginx/sites-enabled/active.conf
# map de WebSocket no bloco http{} do nginx.conf (ver README do nginx)
sudo nginx -t && sudo nginx -s reload
```

Configure `deploy.env` na raiz do repo na VPS (copie de `deploy.env.example`) se
precisar mudar portas/caminhos do nginx.

---

## 5. Backup (Backblaze B2 + Restic)

1. Crie um bucket no B2 e uma **Application Key** restrita a ele.
2. Configure as credenciais e o timer — ver [`backup.md`](backup.md) §Configuração.
3. Teste manual:

   ```bash
   sudo systemctl start restic-backup.service
   journalctl -u restic-backup.service -f
   restic snapshots   # confirma que o snapshot subiu
   ```

---

## 6. Primeiro boot da cor `blue` (produção)

Antes do primeiro deploy automático por tag, faça o bootstrap manual na VPS:

```bash
# 1. shared + cor blue (sobe pg/redis e a primeira cor)
sudo bash infra/deploy/deploy-color.sh blue latest

# 2. aponta o nginx pra blue (se ainda não fez no passo 4)
sudo bash infra/deploy/switch.sh blue

# 3. valida pelo proxy público
curl -fsS http://localhost/api/health   # espera {"status":"ok",...}
```

A partir daí, `git tag vX.Y.Z && git push --tags` dispara o blue-green: o
workflow publica o artefato no GHCR, faz backup, descobre que `blue` está
ativa, prepara `green`, troca o tráfego e para `blue`. O deploy seguinte
alterna de volta.

---

## Checklist de "pronto pra produção"

- [ ] Runner `production` registrado e rodando como serviço
- [ ] Docker + Compose v2 na VPS
- [ ] `apps/api/.env`, `apps/web/.env`, `deploy.env` preenchidos na VPS
- [ ] nginx do host com `blue.conf`/`green.conf` + symlink + map de WebSocket
- [ ] sudo NOPASSWD pro runner (nginx + symlink)
- [ ] `b2-credentials.env` preenchido + `restic-backup.timer` habilitado
- [ ] bootstrap manual da cor `blue` feito e `GET /api/health` ok
