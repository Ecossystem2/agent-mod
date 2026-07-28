// Aplicada só na criação/troca de senha (nunca no login) pra não expulsar users
// legados após mudança de regra.
const MIN_LEN = 12
const MAX_LEN = 128
const TRIVIAL_SEQUENCES = ['abcdefg', '1234567', 'qwerty', 'asdfgh', 'password', 'senha123']

export interface PasswordCheckResult {
  ok: boolean
  reason?: string
}

export function checkPassword(plain: string): PasswordCheckResult {
  if (plain.length < MIN_LEN) return { ok: false, reason: `mínimo ${MIN_LEN} caracteres` }
  if (plain.length > MAX_LEN) return { ok: false, reason: `máximo ${MAX_LEN} caracteres` }

  const classes = [
    /[a-z]/.test(plain),
    /[A-Z]/.test(plain),
    /[0-9]/.test(plain),
    /[^A-Za-z0-9]/.test(plain),
  ].filter(Boolean).length

  if (classes < 3) {
    return { ok: false, reason: 'use ao menos 3 das 4 classes (minúscula, MAIÚSCULA, número, símbolo)' }
  }

  const lower = plain.toLowerCase()
  for (const seq of TRIVIAL_SEQUENCES) {
    if (lower.includes(seq)) return { ok: false, reason: `evite sequências triviais (${seq})` }
  }

  // 5+ caracteres iguais consecutivos (aaaaa, 11111)
  if (/(.)\1{4,}/.test(plain)) {
    return { ok: false, reason: 'evite caracteres repetidos consecutivamente' }
  }

  return { ok: true }
}

export function isStrongPassword(plain: string): boolean {
  return checkPassword(plain).ok
}
