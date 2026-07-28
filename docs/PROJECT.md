# Configuração do Projeto

> Este arquivo ainda não foi preenchido. Execute `/setup` antes de iniciar a primeira task.
> Os condutores vão ler este arquivo automaticamente para entender o contexto do projeto.

## Como configurar

```
/setup
```

O comando vai perguntar 5 coisas:
1. Tipo de sistema (ferramenta interna / SaaS / API pura)
2. Se precisa de auth UI (login, esqueci-senha, reset)
3. Se precisa de email transacional
4. Se precisa de upload de arquivos
5. Breve descrição do domínio de negócio

E, opcionalmente, oferece integração com o **ClickUp** (descobre o List ID via MCP) para criar/puxar tasks com `/create-task-clickup` e `/execute-task-clickup`. O workflow local de tasks continua o default.
