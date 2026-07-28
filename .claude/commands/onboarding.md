---
description: Apresenta o projeto a um dev novo via onboarding-guide. SEMPRE pergunta primeiro o que a pessoa quer (overview / tópico / dúvida).
---

Você acabou de receber um pedido de onboarding. Sua tarefa é simples:

1. Acione o agente `onboarding-guide` via Agent tool (em foreground).

2. No prompt do agente, inclua:
   - `$ARGUMENTS` literalmente (pode estar vazio, ou ser uma dica do que a pessoa quer ver — ex: "arquitetura", "como rodar local", "o que é o `core/`").
   - Instrução explícita: "siga seu workflow obrigatório — PERGUNTE primeiro o que o dev quer (overview / tópico / dúvida direta) antes de responder. Use APENAS `docs/` e `CLAUDE.md` como fonte. Nunca chute."

3. Quando o agente retornar, repasse a resposta dele ao usuário **sem editar** — o agente já formata em PT-BR com links Markdown clicáveis.

4. Se o agente disser "isso ainda não está documentado em docs/" → repasse essa mensagem honestamente. Não complete com sua memória nem com leitura de código.

## NÃO FAZER

- ❌ Pular o agente e responder você mesmo com conhecimento do `CLAUDE.md` — o `onboarding-guide` tem fluxo próprio (pergunta antes, responde depois) e é a fonte canônica de tom/escopo.
- ❌ Ler `.analysis/` (histórico da origem do template) a menos que a pessoa pergunte explicitamente sobre o passado.
- ❌ Recomendar tecnologia fora do stack (`CLAUDE.md` §2).
- ❌ Inventar resposta quando `docs/` não cobre o tópico.

Pedido do usuário: $ARGUMENTS
