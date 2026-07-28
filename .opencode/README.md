# .opencode/ — Configuração para OpenCode

Este diretório existe pra quem usa **OpenCode** ([opencode.ai](https://opencode.ai)) em vez do Claude Code.

## O que o OpenCode já lê de graça

OpenCode **lê o `CLAUDE.md` da raiz como fallback** quando não acha um `AGENTS.md`. Isso significa que **todas as regras do projeto (layering, naming, NÃO FAZER, padrões obrigatórios)** já valem sem você precisar duplicar nada.

Se preferir o nome universal (`AGENTS.md`), basta criar um na raiz — ele tem precedência sobre o `CLAUDE.md`.

## O que o OpenCode NÃO enxerga

Os agents em `.claude/agents/` são proprietários do Claude Code. OpenCode tem seu próprio formato e procura em `.opencode/agents/`.

## Mapeamento Claude Code → OpenCode

### Frontmatter

| Claude Code | OpenCode | Notas |
|---|---|---|
| `name: foo` | derivado do filename (`foo.md`) | OpenCode usa o nome do arquivo |
| `description: ...` | `description: ...` | igual |
| `model: sonnet` | `model: anthropic/claude-sonnet-4-5` (ou outro) | OpenCode pede provider/model completo |
| — | `mode: subagent` ou `primary` | escolha do OpenCode — quase sempre `subagent` pros nossos |
| — | `temperature: 0.0` | opcional, padrão do provider |
| — | `permission:` | controla quais tools o agent pode chamar |

### Pastas

| Claude Code | OpenCode |
|---|---|
| `.claude/agents/<nome>.md` | `.opencode/agents/<nome>.md` |
| `.claude/skills/<nome>.md` | OpenCode usa **comandos** em `.opencode/command/` (formato diferente) |
| `.claude/tasks/CURRENT_TASK.md` | mesmo arquivo, OpenCode não tem convenção própria — apenas leia/escreva |
| `docs/_internal/lessons.md` | mesmo arquivo, ferramenta-agnóstica |

## Como traduzir um agent

Cada agent em `.claude/agents/<nome>.md` pode ser convertido pra `.opencode/agents/<nome>.md` substituindo o frontmatter. O **corpo do markdown (instruções)** é idêntico — Claude Code e OpenCode entendem markdown puro do mesmo jeito.

Veja [`agents/commit-composer.md`](agents/commit-composer.md) como exemplo de tradução.

## Prioridade de tradução (se você for traduzir)

Os mais críticos pra orquestração (traduza primeiro):

1. `dev-conductor`, `backend-conductor`, `frontend-conductor` — pontos de entrada
2. `code-reviewer`, `security-auditor`, `clean-code-reviewer` — pipeline de revisão
3. `lessons-keeper` — memória de erros
4. `commit-composer`, `docs-keeper` — fechamento de task
5. Especialistas (`domain-architect`, `prisma-architect`, `api-engineer`, etc.) — conforme você usar

## opencode.json

Se quiser configurar provider/model padrão, MCPs, allow-lists de tools, etc., crie `opencode.json` na **raiz do projeto** (não dentro deste diretório). Veja [opencode.ai/docs/config](https://opencode.ai/docs/config).
