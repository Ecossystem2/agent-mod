# Plano de Evolução de CI/CD

Este documento transforma a análise de gargalos em um plano executável por PR.
Ordem sugerida:

1. ganhos rápidos de CI;
2. redução de latência em teste e deploy;
3. promoção de artefatos imutáveis.

Regra geral:

- cada PR deve ser pequeno e ter um objetivo único;
- não misturar mudança de pipeline com refactor amplo de app;
- validar o PR antes de seguir para o próximo;
- manter `main` e tags sempre no caminho completo.

---

## PR 1: CI rápido e barato

Objetivo:

- reduzir o tempo médio de feedback sem mudar o modelo de deploy.

Escopo:

- [`.github/workflows/ci.yml`](/C:/Users/Dell/Desktop/TCC/Boilarplate/.github/workflows/ci.yml)
- [`turbo.json`](/C:/Users/Dell/Desktop/TCC/Boilarplate/turbo.json)
- [`package.json`](/C:/Users/Dell/Desktop/TCC/Boilarplate/package.json)
- [`docs/infra/ci-cd-setup.md`](/C:/Users/Dell/Desktop/TCC/Boilarplate/docs/infra/ci-cd-setup.md)

Checklist:

- habilitar Turbo Remote Cache no provedor escolhido;
- documentar as variáveis de cache remoto necessárias;
- revisar se o job de `install` pode ser enxugado sem quebrar isolamento;
- garantir que `lint`, `typecheck` e `build` continuem cobrindo o monorepo em `main`;
- restringir PRs a caminhos afetados quando o diff permitir;
- manter `build` completo em tags e `main`.

Critérios de aceite:

- o tempo de CI em PR cai sem perda de cobertura;
- builds repetidos reaproveitam cache em vez de refazer tudo;
- `main` segue passando no caminho completo.

Riscos:

- cache remoto mal configurado pode mascarar regressões;
- filtro agressivo por caminho pode deixar passar mudança compartilhada;
- redução de jobs cedo demais pode esconder erro estrutural.

---

## PR 2: Menos latência em testes e deploy

Objetivo:

- cortar tempo do caminho crítico sem perder segurança operacional.

Escopo:

- [`.github/workflows/ci.yml`](/C:/Users/Dell/Desktop/TCC/Boilarplate/.github/workflows/ci.yml)
- [`.github/workflows/deploy-production.yml`](/C:/Users/Dell/Desktop/TCC/Boilarplate/.github/workflows/deploy-production.yml)
- [`infra/deploy/deploy-color.sh`](/C:/Users/Dell/Desktop/TCC/Boilarplate/infra/deploy/deploy-color.sh)
- [`infra/deploy/lib.sh`](/C:/Users/Dell/Desktop/TCC/Boilarplate/infra/deploy/lib.sh)
- [`infra/backup/backup-restic.sh`](/C:/Users/Dell/Desktop/TCC/Boilarplate/infra/backup/backup-restic.sh)

Checklist:

- separar unit tests e e2e de forma explícita;
- acionar e2e apenas para mudanças que toquem API, banco ou fila;
- reduzir waits fixos com healthchecks mais determinísticos;
- avaliar `docker compose up --wait` onde fizer sentido;
- tornar o backup pré-deploy condicional a um backup recente e saudável;
- manter o backup diário como proteção independente;
- registrar tempos por etapa do deploy para descobrir o gargalo dominante.

Critérios de aceite:

- o deploy de produção fica mais previsível em duração;
- o backup deixa de travar tudo quando o último snapshot está recente;
- o pipeline continua detectando falhas reais de integração.

Riscos:

- separar demais os testes pode reduzir cobertura integrada;
- relaxar backup em excesso aumenta o risco de rollback sem ponto de restauração recente;
- healthcheck mais agressivo pode gerar falso negativo em VPS lenta.

---

## PR 3: Build uma vez, promover sempre

Objetivo:

- parar de recompilar na VPS e garantir que staging e produção executem o mesmo artefato validado.

Escopo:

- [`.github/workflows/deploy-staging.yml`](/C:/Users/Dell/Desktop/TCC/Boilarplate/.github/workflows/deploy-staging.yml)
- [`.github/workflows/deploy-production.yml`](/C:/Users/Dell/Desktop/TCC/Boilarplate/.github/workflows/deploy-production.yml)
- [`apps/api/Dockerfile`](/C:/Users/Dell/Desktop/TCC/Boilarplate/apps/api/Dockerfile)
- [`apps/web/Dockerfile`](/C:/Users/Dell/Desktop/TCC/Boilarplate/apps/web/Dockerfile)
- [`docker-compose.blue.yml`](/C:/Users/Dell/Desktop/TCC/Boilarplate/docker-compose.blue.yml)
- [`docker-compose.green.yml`](/C:/Users/Dell/Desktop/TCC/Boilarplate/docker-compose.green.yml)
- [`docker-compose.shared.yml`](/C:/Users/Dell/Desktop/TCC/Boilarplate/docker-compose.shared.yml)

Checklist:

- construir imagens no CI uma vez por SHA/tag;
- publicar imagens imutáveis em registry;
- fazer staging consumir o mesmo artefato promovido;
- fazer produção puxar digest/tag já validado;
- registrar a versão implantada em staging e produção;
- usar rollback por artefato anterior, não por rebuild.

Critérios de aceite:

- o que passou em CI é exatamente o que sobe em staging e produção;
- o deploy fica mais rápido porque não recompila na VPS;
- rollback passa a ser troca de artefato, não recriação.

Riscos:

- exige registry e estratégia de tag/digest bem definidas;
- aumenta o número de peças a coordenar no curto prazo;
- precisa padronizar variáveis de imagem em workflow e compose.

---

## Ordem recomendada de execução

1. PR 1.
2. PR 2.
3. PR 3.

Se o objetivo for velocidade de entrega, pare no PR 1 e só depois avance.
Se o objetivo for confiabilidade operacional, trate o PR 2 antes de mexer no build final.
Se o objetivo for maturidade de release, o PR 3 fecha o ciclo.

---

## Trilha paralela: baseline de seguranca

Separada das 3 PRs acima para não virar ruído de CI.

Componentes sugeridos:

- Dependabot para atualizações automáticas das dependências do workspace e `github-actions`;
- audit agendado/manual com foco em dependências de produção;
- bloqueio apenas para severidade alta/critica, se necessário;
- PRs comuns seguem sem gate de segurança pesado.
