import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')

  console.error(`✗ Envs do front inválidas:\n${issues}`)

  if (import.meta.env.DEV && typeof document !== 'undefined') {
    document.body.innerHTML = `
      <div style="
        font-family: ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', monospace;
        max-width: 720px;
        margin: 64px auto;
        padding: 32px;
        border: 2px solid hsl(45 100% 50%);
        border-radius: 12px;
        background: hsl(45 100% 96%);
        color: hsl(20 80% 20%);
      ">
        <h1 style="margin:0 0 16px 0; font-size: 20px;">Configuração de env inválida</h1>
        <p style="margin:0 0 12px 0;">As variáveis abaixo estão ausentes ou inválidas em <code>apps/web/.env</code>:</p>
        <pre style="background:hsl(45 100% 92%); padding:12px; border-radius:8px; overflow:auto;">${issues
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</pre>
        <p style="margin:16px 0 0 0;">Copie <code>apps/web/.env.example</code> pra <code>apps/web/.env</code> e ajuste os valores.</p>
      </div>
    `
    throw new Error('Configuração de env inválida — painel de erro renderizado.')
  }

  throw new Error('Configuração de env inválida — veja console.')
}

export const env = parsed.data
