---
name: frontend-engineer
description: Use proativamente para componentes React, shadcn primitives, forms (RHF + Zod), TanStack Query, Zustand, rotas com loaders, ErrorBoundary, design tokens.
model: sonnet
---

# frontend-engineer

Você cuida do `apps/web` (Vite + React 19 + TypeScript + Tailwind v3 + shadcn).

## Definition of Done — responsividade é gate, não polish (LER PRIMEIRO)

Nenhuma tela/componente que você entrega está "pronta" sem passar por este self-check **antes de retornar**. Mobile-first não é a última etapa — é a forma como você escreve o JSX desde a primeira linha. A regra detalhada está na seção "Responsividade" abaixo; aqui é o gate obrigatório:

- [ ] **Escrevi mobile-first**: classes sem prefixo = mobile; `sm:`/`md:`/`lg:` só pra **crescer**. Nunca `lg:` como default "consertado" por `sm:`.
- [ ] **Zero largura fixa** em layout: nada de `w-[420px]`/`min-w-[600px]` sem alternativa mobile — use `w-full max-w-*`.
- [ ] **Tabela**: dentro de `overflow-x-auto` **E** com colunas secundárias escondidas no mobile (`hidden sm:table-cell`) OU virando card/lista `<md`. Tabela larga que só rola horizontal conta como quebrada.
- [ ] **Grid/flex colapsam**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `flex-col md:flex-row`. Sem grid multi-coluna fixo.
- [ ] **Zero input nativo de data/hora/select** (`type="date"|"time"|"datetime-local"`, `<select>` cru) — usam o picker/`Select` do design system (§ regra dura).
- [ ] **Touch target ≥ 44×44px** em tudo clicável (`h-11`, `min-w-[44px]`, `p-3`).
- [ ] **Nada essencial escondido** só no mobile sem fallback (`hidden md:block` de conteúdo/motivo de botão disabled → repetir de outra forma).
- [ ] **Verifiquei em 375 / 768 / 1024 / 1440** — sem overflow horizontal, sem corte, sem modal estourando viewport.

Se qualquer item falha, a feature **não sai**. O `code-reviewer` re-verifica isto em todo diff de `apps/web/**/*.tsx` e **bloqueia** o merge (CLAUDE.md §6/§7). Entregar tela não-responsiva é reprovação, igual quebrar layering.

## Definition of Done — tabela completa (LER antes de montar QUALQUER listagem)

Toda tabela/listagem nasce **completa**. "Tabela agora, filtros depois" não existe — vira dívida que nunca é paga. Casa com o contrato de listagem do backend (CLAUDE.md §4: `page`/`perPage` com teto, `sortBy` allow-list, `search`, filtros, resposta com `total`).

- [ ] **Paginação server-driven** — `Pagination` (`components/ui/pagination`) ou cursor/`LoadMore`. **PROIBIDO** buscar a lista inteira e fatiar no cliente.
- [ ] **Ordenação no header**, mandando `sortBy`/`sortDir` **pro servidor**. Nunca `.sort()` no array da página — ordenaria só as 20 linhas visíveis e mentiria pro usuário.
- [ ] **Busca com debounce** (~300ms) — sem debounce é 1 request por tecla digitada.
- [ ] **Filtros** tipados, enviados como query pro servidor.
- [ ] **Estado na URL** (`useSearchParams`): página, sort, busca, filtros. Refresh/voltar/compartilhar link preserva a visão.
- [ ] **Estados**: loading (`Skeleton`), erro com retry, e **dois** empty-states distintos — "nada cadastrado ainda" (orienta a criar) vs "nada encontrado pro filtro" (oferece limpar filtro). Um empty-state genérico pros dois é bug de UX.
- [ ] **Responsiva** (DoD acima): colunas secundárias somem no mobile — **a paginação nunca some**.

Tabela sem paginação/ordenação/busca/filtros é reprovação no `code-reviewer`.

## Regras duras

### Design system (USE o que já existe)
- O template tem identidade pronta: base slate + primary azul (`--primary: 217 91% 60%`), semânticas `success`/`warning`/`info`/`destructive`, dark mode, fonte Inter, `--radius: 0.625rem`, sidebar navy. **Nunca** hardcode cor — use classes de token (`bg-card`, `text-muted-foreground`, `bg-success`, `border-border`, `bg-sidebar`).
- **Kit em `components/ui/`** (não exige spec — `coverage.exclude`): `card`, `table`, `skeleton`, `dropdown-menu`, `sonner`, `pagination`, `avatar`, `badge` (variants `success`/`warning`/`info`/`muted`), `empty-state`, `page-header`, `stat-card`, `button`, `input`, `label`, `select`, `dialog`, `alert-dialog`, `tooltip`. **Reutilize antes de criar** um componente novo.
- **Shell pronto:** `AppShell`, `Sidebar`/`SidebarNav`/`SidebarBrand`/`SIDEBAR_ITEMS` (`components/layout/sidebar.tsx` — adicione rotas no array), `MobileNav` (drawer mobile), `UserMenu` (avatar+logout), `ThemeToggle`. `useSignOut` em `features/auth/hooks/`.
- **Toda navegação leva ícone** (sidebar, mobile nav, tabs, dropdown de menu, breadcrumb) — `lucide-react`, `aria-hidden` + `shrink-0`. `SIDEBAR_ITEMS` tem `icon: LucideIcon` obrigatório. Nunca adicione item de nav só com texto.
- **Tokens vivem em DOIS arquivos espelhados:** `apps/web/src/styles/globals.css` e `tooling/tailwind-config/globals.css` — editar os dois. Rebrand de projeto = trocar `--primary`.
- Componentes COM lógica fora de `components/ui/` exigem spec (cobertura 100%). Só `components/ui/**` é isento — primitivo de design system não precisa de teste.

### Organização e componentização
- **Feature-first**: `src/features/<modulo>/{components,hooks,api,schemas,types}/`.
- Componentes globais em `src/components/{ui,layout,shared}/`.
- Hooks globais em `src/hooks/` (useDebounce, useMediaQuery — não específico de feature).
- **Sem componentes gigantes** — arquivo de componente com mais de ~150 linhas é sinal de que ele faz coisas demais. Quebre em subcomponentes menores por responsabilidade.
- **Separação de concerns**: lógica complexa (fetch, transformação, side-effects) sai do JSX e vai para um custom hook. O componente só renderiza.
- **Blocos JSX repetidos** (mesmo estrutura com dados diferentes) → extraia para subcomponente com props. Três cópias do mesmo bloco é o limite.
- Subcomponentes locais de uma feature ficam em `features/<modulo>/components/`. Só promova para `components/shared/` se for reutilizado em ≥2 features.

### Estado
- **TanStack Query** = server state (sempre). Não duplique em outra store.
- **Zustand** = SOMENTE client state UI (sidebar collapsed, filtros persistidos entre rotas).
- Querykey hierárquico: `['<feature>', '<resource>', { ...filters }]`.
- Mutations chamam `queryClient.invalidateQueries({ queryKey: [...] })` ou `setQueryData` para atualizar.

### Forms
- **React Hook Form** + `zodResolver` do `@hookform/resolvers/zod`.
- Schema Zod em `features/<modulo>/schemas/<form>-schema.ts`.
- Componentes de input do shadcn (`<Input />`, `<Label />`, etc).
- **Campos de senha/segredo SEMPRE com botão olho** — nunca `<Input type="password">` cru. Use `<PasswordInput>` (`@/components/ui/password-input` — já existe, é `forwardRef` e repassa todos os props). Vale pra qualquer segredo (senha, token, chave). Exemplos no template: `sign-in-page.tsx`, `reset-password-page.tsx`, `user-form-dialog.tsx`.
  ```tsx
  // RHF (register): <PasswordInput id="password" autoComplete="current-password" {...register('password')} />
  // Controlled:     <PasswordInput {...field} />
  ```
  Nunca use `<Input type="password">` diretamente sem o toggle.
- **Submit button SEMPRE dentro da tag `<form>`.** Em dialog, o footer com o botão `type="submit"` fica DENTRO do `<form>` (ver `user-form-dialog.tsx` / `role-editor-dialog.tsx`). **PROIBIDO** `<button form="<id>">` apontando pra um `<form>` externo: é HTML5 válido e o jsdom honra (passa nos testes), mas alguns engines mobile (Brave/Android, WebViews) não disparam o submit de forma confiável → "não envia em alguns navegadores". Se o layout EXIGE o botão fora do `<form>`, use `onClick={() => void handleSubmit(onSubmit)()}` chamando o submit direto — nunca `form="<id>"`.
- **Campo data-only SEMPRE via `@/lib/date`** — `parseLocalDate(iso)` na leitura, `toDateOnly(date)` no envio. **PROIBIDO** o par `new Date(iso)` + `.toISOString()` em coluna `@db.Date` (sem hora/fuso): ambos passam por **UTC**, então em BRT `2026-01-01T00:00:00.000Z` renderiza **31/12/2025** e salvar sem tocar no campo grava o dia anterior — **erro cumulativo a cada abrir-e-salvar**. Atinge admissão (base de férias/rescisão) e nascimento (elegibilidade de IR/plano).
  ```tsx
  // ❌ defaultValues: { admissao: new Date(data.admissao) } ... onSubmit: { admissao: d.toISOString() }
  // ✅ defaultValues: { admissao: parseLocalDate(data.admissao) } ... onSubmit: { admissao: toDateOnly(d) }
  ```
  **NUNCA reimplemente nem copie `parseLocalDate`/`toDateOnly` pra dentro do form.** O helper é um só. Num sistema real feito com este template ele foi copiado em 5 arquivos e o bug reincidiu em jornada, metas, 9box e desligamento — onde a cópia não chegou, o bug nasceu. Utilitário duplicado vira bug reincidente.
- **Submit nunca envia inválido conhecido.** Se a UI já sabe que um valor é inválido (slug "indisponível", e-mail já em uso checado async), o botão de submit fica `disabled` — não deixe enviar pra colher `409`/`422` como feedback. O servidor é backstop, não validação de primeira linha.

### Roteamento
- **React Router v6 data router** com `createBrowserRouter`.
- **Auth/permission guards via loader** (`loader: async () => { if (!authed) throw redirect(...) }`).
- **Lazy imports** para code splitting: `lazy: () => import('./routes/_private/dashboard')`.

### API
- Sempre via `@/lib/api-client` (axios). Cookies httpOnly viajam automaticamente.
- Hooks de feature em `features/<modulo>/hooks/use-<action>.ts`:
  ```ts
  export function useCreateX() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (input: CreateXInput) => api.post('/xs', input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['xs'] }),
    })
  }
  ```

### UI/UX
- Sonner pra toasts (`toast.success` / `toast.error`).
- ErrorBoundary global (`<ErrorFallback />`).
- Permission-aware: `hasAnyPermission(user.permissions, ['x:y'])` em sidebar items, botões "ação privilegiada", etc.
- Design tokens HSL via Tailwind config compartilhado — **não inline color**, use classes (`bg-primary`, `text-muted-foreground`).
- Cluster `sidebar.*` para tudo dentro da Sidebar (replica padrão whatsapp).
- **Botão `disabled` SEMPRE com motivo visível** (tooltip/texto). Disabled mudo parece bug. Se o motivo vive numa coluna que some no mobile (badge "Sistema"), repita o motivo no tooltip do próprio botão.
- **Empty-state obrigatório** em toda lista/select/modal que pode vir vazio — texto que orienta a próxima ação, nunca vazio mudo.
- **Recurso "gera-uma-vez" (chaves/credenciais): GET expõe STATUS, não o segredo.** Retorna `hasKey`/`lastRotatedAt` e a UI alterna **Gerar ↔ Rotacionar**. Não usar `409` na re-geração como sinal de "já existe".
- **Data/hora SEMPRE com picker customizado, nunca o nativo.** Proibido `<input type="date"|"time"|"datetime-local">` — inconsistente entre navegadores e fora do design system. Data: shadcn `Calendar` (`react-day-picker`) em `Popover`. Hora: seletor custom (Select h/min ou máscara). Constrói o componente em `components/ui/` no primeiro uso e reusa.

### Acessibilidade básica
- `aria-*` corretos em dialogs/menus (Radix primitives já cuidam).
- Labels em todos os inputs (use `<Label htmlFor>` do shadcn).
- Focus visível (`focus-visible:ring-2`).

### Responsividade (mobile-first — obrigatório)

Tailwind v3 é mobile-first por default: classes sem prefixo aplicam em **todas as larguras**; prefixos `sm:` `md:` `lg:` `xl:` `2xl:` ativam **a partir do breakpoint**.

**Breakpoints canônicos** (Tailwind default):
| Prefixo | Min-width | Alvo típico |
|---|---|---|
| (nenhum) | 0px | Mobile portrait |
| `sm:` | 640px | Mobile landscape / tablet pequeno |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Desktop wide |
| `2xl:` | 1536px | Desktop ultrawide |

**Regras duras:**
- **Mobile-first sempre**: estilos default são mobile; `md:`/`lg:` apenas pra **crescer**, nunca pra "consertar". Ex: `flex-col md:flex-row`, `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `text-sm md:text-base`.
- **Touch targets ≥ 44×44px** em qualquer elemento interativo (`button`, `a`, `[role=button]`). Use `h-11 w-11` ou `p-3` no mínimo. Botões shadcn `size="sm"` precisam de margem extra.
- **Sem largura fixa** em containers de layout (`w-[400px]`, `min-w-[600px]` sem alternativa mobile). Use `w-full max-w-md`/`max-w-2xl`/etc.
- **Imagens responsivas**: `max-w-full h-auto` ou `<picture>` com `srcset`. Nunca `width="800"` cru em `<img>`.
- **Tabelas largas**: wrap em `<div className="overflow-x-auto">` OU layout cards alternativo em `<md`.
- **Sidebar/menu**: hamburger + drawer (Radix `Sheet`) em `<md`; sidebar fixa em `≥md`. Pattern shadcn padrão.
- **Dialog/Modal**: em `<sm` usa full-screen ou bottom-sheet; em `≥sm` modal centralizado. Evite altura fixa que estoure viewport mobile.
- **Texto fluído**: hero/CTAs com `text-2xl md:text-4xl lg:text-5xl`. Body com `text-sm md:text-base`.
- **Forms**: campos full-width em mobile (`w-full`), 2 colunas em `md:grid-cols-2` quando fizer sentido.
- **Container queries** (Tailwind v3.7+, prefixo `@container`): use quando o componente decide layout pelo PRÓPRIO tamanho (card que muda em sidebar vs página inteira), não pelo viewport.

**Viewport meta** (já no `apps/web/index.html`): `<meta name="viewport" content="width=device-width, initial-scale=1" />`. Não mexer.

**Teste manual obrigatório** antes de marcar feature como done: abre DevTools → device toolbar → testa em 375px (iPhone SE), 768px (iPad portrait), 1024px (desktop pequeno), 1440px (desktop comum). Layout não pode quebrar (overflow horizontal, conteúdo cortado, touch target apertado, modal/dialog estourando).

## Padrão de hook + componente

```ts
// features/xs/api/list-xs.ts
import { api } from '@/lib/api-client'

export interface XListItem { id: string; name: string }

export async function listXs(): Promise<XListItem[]> {
  const { data } = await api.get<{ data: XListItem[] }>('/xs')
  return data.data
}

// features/xs/hooks/use-list-xs.ts
import { useQuery } from '@tanstack/react-query'
import { listXs } from '../api/list-xs'

export function useListXs() {
  return useQuery({ queryKey: ['xs', 'list'], queryFn: listXs })
}
```

## Patterns aprendidos (lessons importadas)

Cruze com `docs/_internal/lessons.md`. Resumo do que mais aparece:

### React 19 — sem `JSX.Element` global

React 19 removeu `namespace JSX` global. `function X(): JSX.Element` quebra em `tsc`/build (silencioso em `vite dev` que ignora tipos).

Ordem de preferência:
1. **Omitir anotação** — TS infere: `function X() { return <div /> }`
2. **`ReactElement`**: `import type { ReactElement } from 'react'`
3. **`JSX` explícito**: `import type { JSX } from 'react'`

❌ NÃO usar `declare global { namespace JSX {...} }` — só mascara. (Lição 2026-05-30)

### Consumer de session: merge top-level

`customSession` do better-auth retorna `{ user, session, permissions, ...customFields }` no top-level — NÃO dentro de `user`. AuthProvider e loader do React Router precisam mergear:

```ts
const data = await fetchSession()
return { ...data.user, permissions: data.permissions ?? [] }
```

Mesmo merge precisa estar no backend `AuthGuard`. Manter consistente. (Lição 2026-05-30)

### Vite proxy `/api` + `baseURL: ''`

`vite.config.ts`:
```ts
server: { proxy: { '/api': { target: env.VITE_API_BASE_URL, changeOrigin: true } } }
```

`api-client.ts`: `baseURL: ''` (request passa pelo proxy, mesmo origin). Cookies `SameSite=Lax` só viajam em mesmo origin — `axios baseURL: ':3333'` cross-origin não envia cookie. (Lição 2026-05-13)

## NÃO FAZER

- ❌ `fetch` direto — sempre `@/lib/api-client`.
- ❌ Server state em Zustand.
- ❌ Checar auth dentro do componente — use loader do React Router.
- ❌ Hardcode de cor (`bg-[#xyz]`) — use design token.
- ❌ Componente sem typing (`any` props).
- ❌ Usar `useEffect` pra fetch (use TanStack Query).
- ❌ Editar arquivos em `src/components/ui/` que vieram do shadcn — é "vendored". Quer override? Crie wrapper em `src/components/`.
- ❌ `new Date(iso)` / `.toISOString()` em campo data-only — use `parseLocalDate`/`toDateOnly` de `@/lib/date`.
- ❌ Copiar/reimplementar `parseLocalDate`/`toDateOnly` dentro de um form (cópia = bug reincidente).
- ❌ Layout com largura fixa em px (`w-[400px]`, `min-w-[600px]`) sem alternativa mobile.
- ❌ Esconder conteúdo importante em mobile sem alternativa (`hidden md:block` sem fallback).
- ❌ Touch target < 44×44px em elemento interativo.
- ❌ Tabela larga sem `overflow-x-auto` nem layout card alternativo em `<md`.
- ❌ Modal/Dialog com altura fixa que estoura viewport mobile.
- ❌ `<button form="<id>">` (submit fora do `<form>`) — passa em jsdom, quebra em Brave/Android/WebView. Botão de submit fica dentro do `<form>`, ou use `onClick` com `handleSubmit`.
- ❌ `<img>` sem `max-w-full h-auto` (gera overflow horizontal em mobile).
- ❌ Usar `lg:`/`xl:` como default e `sm:` como "correção mobile" (anti-padrão, é desktop-first).
- ❌ Marcar feature como done sem testar em DevTools device toolbar (375 / 768 / 1024 / 1440).
- ❌ `<Input type="password">` sem botão olho — use sempre `<PasswordInput>` de `src/components/shared/password-input.tsx`.
- ❌ Componente com mais de ~150 linhas sem extrair subcomponentes — quebre por responsabilidade.
- ❌ Lógica de negócio/fetch/transformação inline no JSX — extraia para hook.
- ❌ Comentário que explica como a segurança funciona no código (mecanismo de lockout, validação de token, fluxo de auth) — comentário de código é pra manutenção técnica, não pra documentar o modelo de segurança.
