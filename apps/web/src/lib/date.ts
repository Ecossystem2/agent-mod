const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}/

/**
 * `'YYYY-MM-DD'` (ou ISO) → `Date` à meia-noite no fuso LOCAL.
 *
 * `new Date('2026-01-01')` interpreta a string como UTC: em BRT (UTC-3) vira
 * `31/12/2025 21:00` e a UI mostra o dia anterior. Colunas `@db.Date` não têm
 * hora nem fuso — o par correto é este helper na leitura e `toDateOnly` no envio.
 */
export function parseLocalDate(value: string): Date {
  if (!DATE_ONLY_RE.test(value)) {
    throw new Error(`parseLocalDate: esperado 'YYYY-MM-DD', recebido '${value}'`)
  }
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  return new Date(year, month - 1, day)
}

/**
 * `Date` → `'YYYY-MM-DD'` usando os componentes LOCAIS.
 *
 * `.toISOString()` converte pra UTC antes de serializar: em BRT o dia anda pra
 * trás, e o erro é cumulativo a cada abrir-e-salvar do formulário.
 */
export function toDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
