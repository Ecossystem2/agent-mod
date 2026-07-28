# nginx do host (blue-green switch)

O nginx **do host** (não o do container `web`) é o reverse-proxy público. Ele aponta
para a cor **ativa** via um symlink que os scripts de deploy manipulam.

```
internet → nginx host (:80/:443) → /api → API da cor ativa (3341|3342)
                                   → /    → WEB da cor ativa (8081|8082)
```

## Arquivos

| Arquivo | Aponta pra |
|---|---|
| `blue.conf`  | API `127.0.0.1:3341`, WEB `127.0.0.1:8081` |
| `green.conf` | API `127.0.0.1:3342`, WEB `127.0.0.1:8082` |

As portas casam com `deploy.env` (`BLUE_*` / `GREEN_*`) e com os composes por cor.

## Instalação (uma vez, na VPS)

1. Copie os confs pra `sites-available`:

   ```bash
   sudo cp infra/nginx/blue.conf  /etc/nginx/sites-available/blue.conf
   sudo cp infra/nginx/green.conf /etc/nginx/sites-available/green.conf
   ```

2. Crie o symlink da cor ativa inicial (convenção: começa em `blue`):

   ```bash
   sudo ln -sfn /etc/nginx/sites-available/blue.conf /etc/nginx/sites-enabled/active.conf
   ```

   > A partir daí, `switch.sh`/`rollback.sh` cuidam do symlink. Não edite à mão.

3. **WebSocket** — adicione este `map` ao bloco `http {}` do `nginx.conf` do host
   (uma vez), pois os confs usam `$connection_upgrade`:

   ```nginx
   map $http_upgrade $connection_upgrade {
       default upgrade;
       ''      close;
   }
   ```

4. Valide e recarregue:

   ```bash
   sudo nginx -t && sudo nginx -s reload
   ```

## Switch / rollback

Não mexa no symlink manualmente — use os scripts:

```bash
sudo infra/deploy/switch.sh green     # passa o tráfego pra green
sudo infra/deploy/rollback.sh         # volta pra cor anterior
```

Ambos rodam `nginx -t` antes de `nginx -s reload`; se a config estiver inválida,
revertem o symlink e abortam sem recarregar.

## TLS

Termine TLS aqui no host (Certbot/Let's Encrypt) adicionando o `listen 443 ssl`
e os certificados nos dois confs, ou num server block separado que faça
`proxy_pass` pro mesmo upstream. O mecanismo de switch não muda.
