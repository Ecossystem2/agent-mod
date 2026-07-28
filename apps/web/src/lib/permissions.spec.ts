import { describe, expect, it } from 'vitest'

import { hasAnyPermission } from './permissions'

describe('hasAnyPermission', () => {
  it('retorna true quando required é vazio (sem exigência)', () => {
    expect(hasAnyPermission(['admin:users'], [])).toBe(true)
    expect(hasAnyPermission(undefined, [])).toBe(true)
  })

  it('retorna false quando userPerms é undefined e há exigência', () => {
    expect(hasAnyPermission(undefined, ['admin:users'])).toBe(false)
  })

  it('retorna false quando userPerms é vazio e há exigência', () => {
    expect(hasAnyPermission([], ['admin:users'])).toBe(false)
  })

  it('retorna true quando há interseção entre userPerms e required', () => {
    expect(hasAnyPermission(['admin:roles', 'admin:users'], ['admin:users', 'billing:write'])).toBe(
      true,
    )
  })

  it('retorna false quando não há interseção', () => {
    expect(hasAnyPermission(['view:dashboard'], ['admin:users', 'admin:roles'])).toBe(false)
  })
})
