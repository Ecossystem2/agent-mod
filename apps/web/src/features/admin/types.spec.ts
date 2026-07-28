import { describe, expect, it } from 'vitest'

import { ADMIN_PERMISSIONS, PERMISSION_CATEGORIES } from './types'


describe('types — constantes de permissao', () => {
  it('ADMIN_PERMISSIONS contém todas as permissoes esperadas', () => {
    expect(ADMIN_PERMISSIONS).toContain('admin:users')
    expect(ADMIN_PERMISSIONS).toContain('admin:roles')
    expect(ADMIN_PERMISSIONS).toContain('view:dashboard')
    expect(ADMIN_PERMISSIONS).toContain('view:settings')
    expect(ADMIN_PERMISSIONS).toContain('manage:settings')
    expect(ADMIN_PERMISSIONS).toHaveLength(5)
  })

  it('PERMISSION_CATEGORIES tem 3 categorias', () => {
    expect(PERMISSION_CATEGORIES).toHaveLength(3)
  })

  it('categoria Administracao contém admin:users e admin:roles', () => {
    const cat = PERMISSION_CATEGORIES.find((c) => c.label === 'Administração')
    expect(cat).toBeDefined()
    expect(cat?.permissions).toContain('admin:users')
    expect(cat?.permissions).toContain('admin:roles')
  })

  it('categoria Visualizacao contém view:dashboard e view:settings', () => {
    const cat = PERMISSION_CATEGORIES.find((c) => c.label === 'Visualização')
    expect(cat).toBeDefined()
    expect(cat?.permissions).toContain('view:dashboard')
    expect(cat?.permissions).toContain('view:settings')
  })

  it('categoria Configuracoes contém manage:settings', () => {
    const cat = PERMISSION_CATEGORIES.find((c) => c.label === 'Configurações')
    expect(cat).toBeDefined()
    expect(cat?.permissions).toContain('manage:settings')
  })

  it('todas as permissoes de todas as categorias estao em ADMIN_PERMISSIONS', () => {
    const allPerms = PERMISSION_CATEGORIES.flatMap((c) => c.permissions)
    for (const perm of allPerms) {
      expect(ADMIN_PERMISSIONS).toContain(perm)
    }
  })

  it('a uniao de todas as categorias cobre ADMIN_PERMISSIONS completo', () => {
    const allPerms = PERMISSION_CATEGORIES.flatMap((c) => c.permissions)
    for (const perm of ADMIN_PERMISSIONS) {
      expect(allPerms).toContain(perm)
    }
  })
})
