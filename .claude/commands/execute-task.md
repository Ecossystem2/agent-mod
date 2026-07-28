---
description: Executa uma task fullstack/backend/frontend escalando a cerimônia ao tamanho dela (§7.1) — fix trivial sai direto; task normal/grande vai pro conductor com CURRENT_TASK + aprovação.
---

Você acabou de receber um pedido de task do usuário. Sua tarefa:

0. **CLASSIFIQUE O TIER PRIMEIRO (CLAUDE.md §7.1).** O caminho do conductor orquestra **19 agentes e ~5 pausas humanas**. Isso é certo pra task normal/grande e é desperdício puro num fix de 1 linha — é literalmente por isso que "qualquer task demora horas".

   - **Trivial** (1 arquivo; não toca contrato público/auth/RBAC/`infra/`/`core/`) → **NÃO acione conductor.** Faça a edição você mesmo, rode só o gate relevante (typecheck se mexeu em tipo; o teste do arquivo se mexeu em lógica) e reporte. Sem `CURRENT_TASK.md`, sem pausa de aprovação, sem esteira.
   - **Pequena** (1 BC; ≤ ~4 arquivos; sem mudar contrato nem superfície de segurança) → acione o conductor **informando o tier**, pra ele rodar o caminho leve (sem pausa de aprovação; esteira só com os reviewers cujo gatilho bateu).
   - **Normal/Grande** (multi-arquivo, OU muda contrato, OU toca auth/RBAC/infra/`core/`, OU ≥2 agregados) → conductor, pipeline completo.

   **Na dúvida real, suba um nível.** Diga o tier na primeira frase da resposta, pro humano poder te corrigir antes de pagar a cerimônia.

1. **(Tier pequena/normal/grande)** Identifique se é fullstack, só backend ou só frontend.
   - **Fullstack**: toca em `apps/api/` E `apps/web/`, ou muda contrato HTTP visível pro front.
   - **Só backend**: muda apenas `apps/api/`, `packages/` consumidos pelo backend, schema Prisma, jobs, webhooks.
   - **Só frontend**: muda apenas `apps/web/`, rotas, componentes, estado client-side, sem mudar API.
   - Em caso de dúvida → trate como fullstack.

2. Acione o agente conductor correspondente via Agent tool (em foreground):
   - Fullstack → `dev-conductor`
   - Só backend → `backend-conductor`
   - Só frontend → `frontend-conductor`

3. No prompt do conductor, inclua:
   - O pedido **literal** do usuário (`$ARGUMENTS`).
   - **O tier que você classificou no passo 0** — o conductor escala a cerimônia por ele.
   - Qualquer contexto que ele tenha mencionado antes nesta conversa (arquivo aberto na IDE, decisão prévia, restrição já discutida).
   - **Não force cerimônia por instrução.** Quem decide se cria `CURRENT_TASK.md` e se pausa pra aprovação é o tier (§7.1), não este comando. Em tier pequena, exigir "CURRENT_TASK + PARE pra aprovação" desfaz justamente a economia.

4. Quando o conductor retornar:
   - **Tier normal/grande:** mostre o caminho do `CURRENT_TASK.md`, resumo curto (≤5 bullets) e pergunte "Aprova? (sim / ajustar / cancelar)".
   - **Tier pequena:** mostre o que foi feito e o resultado do gate. Uma confirmação no fim basta.

## NÃO FAZER

- ❌ **Acionar conductor pra fix trivial** — o overhead de orquestrar é maior que o fix.
- ❌ **Forçar `CURRENT_TASK.md` + pausa de aprovação em tier trivial/pequena** — a cerimônia é escalada pelo §7.1, não imposta por este comando.
- ❌ Começar a codar antes da aprovação humana **em tier normal/grande**.
- ❌ Pular o conductor e chamar especialistas (`domain-architect`, `api-engineer`, etc.) diretamente **em tier pequena/normal/grande** (em trivial você mesmo edita).
- ❌ Criar `CURRENT_TASK.md` você mesmo — quem cria é o conductor (e só em tier normal/grande).
- ❌ Adicionar feature de exemplo "pra ilustrar" — este repo é template, zero negócio (ver `CLAUDE.md` §9).

Pedido do usuário: $ARGUMENTS
