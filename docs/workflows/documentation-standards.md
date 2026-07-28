# Documentation Standards

Padrão canônico de documentação por nível de profundidade. Toda funcionalidade, módulo, integração ou arquitetura documentada deve poder ser gerada em 3 níveis:

1. **Técnica** — para desenvolvedores e arquitetos.
2. **Moderada** — para gestores de produto, analistas e desenvolvedores.
3. **Leiga** — para clientes, usuários finais e stakeholders sem conhecimento técnico.

Este arquivo é a fonte que o agent `task-documenter` consulta antes de gerar saída. Mudou aqui → mudou em todo output futuro.

---

## Nível 1 — Documentação Técnica

**Objetivo:** explicar exatamente como o sistema funciona internamente.

**Público:** desenvolvedores, arquitetos de software, DevOps, tech leads.

### Estrutura obrigatória

#### Visão Geral
Finalidade técnica da funcionalidade.

#### Arquitetura
- Componentes envolvidos
- Fluxo de comunicação
- Dependências
- Serviços externos

#### Fluxo Completo
Passo a passo:
1. Origem da requisição
2. Processamentos intermediários
3. Regras aplicadas
4. Persistência
5. Resposta final

#### Estrutura de Dados
- Entidades
- Tabelas
- Campos relevantes
- Relacionamentos

#### APIs e Endpoints
Para cada endpoint:
- Método HTTP
- URL
- Payload
- Response
- Possíveis erros

#### Regras de Negócio
Todas as regras implementadas.

#### Segurança
- Autenticação
- Autorização
- Permissões
- Logs
- Auditoria

#### Pontos de Atenção
- Limitações
- Riscos
- Gargalos
- Débitos técnicos

#### Exemplos
- Payload de request
- Payload de response
- Fluxogramas em Mermaid

---

## Nível 2 — Documentação Moderada

**Objetivo:** explicar como a funcionalidade opera sem entrar profundamente no código.

**Público:** Product Owners, analistas, gerentes, desenvolvedores iniciantes.

### Estrutura obrigatória

#### O que é
Explicação simples da funcionalidade.

#### Problema Resolvido
Necessidade de negócio atendida.

#### Como Funciona
Fluxo resumido do processo.

#### Integrações
Sistemas envolvidos.

#### Regras Importantes
Só regras relevantes pra operação.

#### Benefícios
- Ganhos operacionais
- Automações
- Segurança
- Escalabilidade

#### Limitações
Restrições conhecidas.

#### Exemplo de Uso
Cenário real de utilização.

---

## Nível 3 — Documentação Leiga

**Objetivo:** explicar pra qualquer pessoa sem conhecimento técnico.

**Público:** clientes, usuários finais, diretores, investidores.

### Estrutura obrigatória

#### O que esta funcionalidade faz
Linguagem simples.

#### Qual problema ela resolve
Foco no benefício.

#### Como funciona na prática
Passo a passo simplificado.

#### Exemplo Real
Situação cotidiana.

#### Benefícios
- Economia de tempo
- Redução de erros
- Facilidade de uso

#### O que o usuário precisa fazer
Ações necessárias do usuário.

#### O que acontece automaticamente
Automações do sistema.

---

## Regras gerais (qualquer nível)

### Nunca
- Inventar informações.
- Assumir comportamentos não documentados.
- Criar regras inexistentes.
- Omitir limitações conhecidas.

### Sempre
- Markdown com títulos hierárquicos.
- Listas quando apropriado.
- Exemplos práticos.
- Siglas explicadas na primeira ocorrência.
- Dependências externas explícitas.

### Tom

| Nível | Tom |
|---|---|
| Técnica | Objetivo, detalhado, preciso |
| Moderada | Didático, orientado a negócio |
| Leiga | Simples, claro, sem jargões |

---

## Instrução pra o agente

Ao receber solicitação de documentação:

1. Identifique o público-alvo.
2. Escolha um dos 3 níveis (ou pergunte ao user).
3. Sem instrução: gerar nível **Moderada**.
4. Se pedido, gere múltiplas versões do mesmo conteúdo.
5. Priorize clareza, rastreabilidade e precisão sobre volume de texto.

Convenção de saída pro `task-documenter`:

- Path: `docs/tasks/<slug>/<nivel>.<ext>`
  - `<slug>`: nome da task (sem prefix de data).
  - `<nivel>`: `leigo` | `moderado` | `tecnico`.
  - `<ext>`: `md` | `docx` | `pdf`.
- Sempre gerar `.md` como source-of-truth. Conversão via pandoc.
