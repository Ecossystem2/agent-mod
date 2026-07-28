---
description: Audita a sessão atual procurando atritos (instruções repetidas, dúvidas que voltaram, suposições erradas, anti-patterns reincidentes) e propõe deltas mínimos no CLAUDE.md, docs e agents pra reduzir o atrito da próxima vez. Não edita sem aprovação humana.
---

Você acabou de ser chamado pra auditar a sessão atual e propor melhorias no template.

## Quando rodar

- Após terminar uma task grande que cruzou várias camadas.
- Quando uma decisão técnica não-óbvia foi tomada (vale virar ADR ou nota em CLAUDE.md).
- Quando o usuário corrigiu o agent mais de duas vezes na mesma sessão.
- Manualmente: `/reflect`.

## 1. Antes de QUALQUER ação

1. Leia `CLAUDE.md` na raiz — é o doc principal a ser melhorado.
2. Liste docs canônicas:
   - `docs/architecture/` (se existir) — patterns + ADRs
   - `docs/_internal/lessons.md` — memória de erros
3. Liste agents em `.claude/agents/` e commands em `.claude/commands/`.

## 2. Extrair atritos da sessão (Fase 1)

Olhar pra trás na conversa atual. Categorize:

| Categoria | Sinal | Ação |
|---|---|---|
| **Instrução repetida** | User precisou dizer a mesma coisa 2+ vezes ("não usa shadcn no api", "sem ORM além de Prisma") | CLAUDE.md ou agent description |
| **Suposição errada** | Agent assumiu Fastify quando é NestJS, Vitest 1 quando é 4, etc | Reforçar stack na seção pertinente |
| **Anti-pattern reincidente** | `try/catch` engolindo, `as any`, mock no spec quando há in-memory | Reforçar nos reviewers ou criar lição em `lessons.md` |
| **Decisão sem registro** | Escolha A/B feita verbalmente sem ADR | Sugerir `@technical-designer` pra criar ADR |
| **Doc desatualizado** | Doc não bate com código (ex: porta diferente, versão desatualizada) | Patch no doc |
| **Skill/agent ausente** | Tarefa repetitiva sem skill (3+ ocorrências) | Sugerir criar skill |
| **Skill/agent redundante** | Dois agents fazem a mesma coisa | Sugerir merge ou clarificar trigger |
| **Trigger fraco** | Agent não foi acionado quando deveria | Refinar `description` (é o seletor) |

## 3. Classificar por impacto (Fase 2)

Pra cada atrito:

- **Patch leve** (line-level no doc): adicionar bullet, atualizar tabela, corrigir número.
- **Seção nova**: gotcha novo que precisa de subseção.
- **Doc novo**: regra grande o suficiente pra merecer arquivo próprio (ADR, novo BC).
- **Agent/skill novo**: padrão repetitivo (≥3 ocorrências) que vale automatizar.
- **Agent/skill ajuste**: refinar `description` (trigger) ou prompt.

## 4. Propor diff plan ANTES de editar (Fase 3)

Formato fixo:

```markdown
# Reflect — proposta de deltas

## Atritos detectados nesta sessão
1. **Suposição: pacote X em vez de Y** — apareceu em N momentos antes da correção
2. **Stack Prisma**: agent assumiu Prisma 5 em vez de 7
3. **Decisão sem ADR**: escolha entre BullMQ vs Agenda discutida sem registro

## Patches propostos

### 1. CLAUDE.md (linha ~N)
**Antes:**
> ...
**Depois (acrescentar):**
> ...

### 2. docs/architecture/cache.md §3
Adicionar nota: "..."

### 3. docs/architecture/decisions/NNNN-<tema>.md (NOVO via @technical-designer)
Tema: <decisão capturada>

### 4. .claude/agents/<nome>.md (description)
**Antes:** "..."
**Depois:** "..."

## Skills/agents — sugestões
- **CRIAR** `/<comando>` — esta sessão fez 3+ vezes manualmente.
- **AJUSTAR** description do `@<agent>` (item 4).

## Não vou editar nada sem sua aprovação. OK por todos? Algum descarta?
```

## 5. Aplicar com confirmação (Fase 4)

Após user confirmar (pode ser parcial: "OK 1, 2, 4; descarta 3"):
1. Aplicar com `Edit`/`Write`.
2. Mostrar diff resumido por arquivo.
3. Sugerir commit ao usuário (não executar):
   ```
   docs: reflect after <task> — registra <atritos>
   ```

## 6. Reportar (Fase 5)

```markdown
✅ Reflect aplicado

**Editados:** N arquivos
**Novos:** M arquivos (ADR, skills, etc.)

**Próximo /reflect:** depois da próxima task grande, ou em ~10 sessões.
```

## Modo deep (opcional)

Se `$ARGUMENTS` contém `deep`, expandir:
- Analisar últimos 5 commits (`git log --oneline -5`) + PRs recentes pra detectar padrões.
- Cruzar com `docs/` pra detectar BCs sem regras documentadas.
- Sugerir reorganização da hierarquia de docs.

Fora de "deep", manter foco apenas na sessão atual.

## Regras

1. **Nunca edita sem aprovação.** Diff plan é obrigatório.
2. **Patches mínimos.** Adicionar uma linha > reescrever seção.
3. **Não duplica info entre docs.** Se já tá em `docs/architecture/`, CLAUDE.md só linka.
4. **CLAUDE.md é o índice**, não o repositório. Manter abaixo de ~200 linhas; informação detalhada vai pra `docs/`.
5. **Não cria skill por uma única ocorrência.** Mínimo 3 repetições.
6. **Não cria agent por sobreposição.** Se já existe `@code-reviewer`, não cria `@reviewer` parecido.
7. **Tom técnico.** Sem moralizar ("aprendemos que..."). Só fato + delta.
8. **PT-BR.**
9. **Não trate erro do usuário como atrito sistêmico** — atrito é coisa que se repete por **ambiguidade** ou **doc faltando**.
10. Se há lição não-trivial mas ela é mais útil pra `lessons-keeper` do que pra CLAUDE.md, sugira invocar `@lessons-keeper` em vez de patchear CLAUDE.md.

Pedido do usuário: $ARGUMENTS
