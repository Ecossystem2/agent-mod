import { describe, expect, it } from 'vitest'

import { PERMISSIONS, hasAnyPermission } from './permissions'

describe('PERMISSIONS', () => {
  it('contém todas as permissões esperadas', () => {
    expect(PERMISSIONS).toContain('admin:users')
    expect(PERMISSIONS).toContain('admin:roles')
    expect(PERMISSIONS).toContain('view:dashboard')
    expect(PERMISSIONS).toContain('view:settings')
    expect(PERMISSIONS).toContain('manage:settings')
  })

  it('tem exatamente 5 permissões', () => {
    expect(PERMISSIONS).toHaveLength(5)
  })
})

describe('hasAnyPermission', () => {
  it('retorna true quando nenhuma permissão é requerida', () => {
    expect(hasAnyPermission([], [])).toBe(true)
  })

  it('retorna true quando o usuário tem ao menos uma das requeridas', () => {
    expect(hasAnyPermission(['admin:users', 'view:dashboard'], ['admin:users'])).toBe(true)
  })

  it('retorna true quando o usuário tem apenas uma das múltiplas requeridas', () => {
    expect(hasAnyPermission(['view:dashboard'], ['admin:users', 'view:dashboard'])).toBe(true)
  })

  it('retorna false quando o usuário não tem nenhuma das requeridas', () => {
    expect(hasAnyPermission(['view:dashboard'], ['admin:users'])).toBe(false)
  })

  it('retorna false quando o usuário não tem permissões', () => {
    expect(hasAnyPermission([], ['admin:users'])).toBe(false)
  })

  it('retorna true para admin:roles', () => {
    expect(hasAnyPermission(['admin:roles'], ['admin:roles'])).toBe(true)
  })

  it('retorna true para manage:settings', () => {
    expect(hasAnyPermission(['manage:settings'], ['manage:settings'])).toBe(true)
  })

  it('retorna true para view:settings', () => {
    expect(hasAnyPermission(['view:settings'], ['view:settings'])).toBe(true)
  })
})
