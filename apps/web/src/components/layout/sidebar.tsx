import { Boxes, Shield, Users, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import type { ReactElement } from 'react'

import { cn } from '@/lib/cn'
import { hasAnyPermission } from '@/lib/permissions'
import { useAuth } from '@/providers/auth-context'

export interface SidebarItem {
  to: string
  label: string
  icon: LucideIcon
  /** Permissões necessárias (any-of). Array vazio = público pros logados. */
  requiresAny: readonly string[]
}

export const SIDEBAR_ITEMS: readonly SidebarItem[] = [
  { to: '/app/admin/users', label: 'Usuarios', icon: Users, requiresAny: ['admin:users'] },
  { to: '/app/admin/roles', label: 'Cargos', icon: Shield, requiresAny: ['admin:roles'] },
]

export function SidebarBrand(): ReactElement {
  return (
    <div className="flex items-center gap-2 px-6 py-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Boxes className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-lg font-semibold tracking-tight">Template</span>
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }): ReactElement {
  const { user } = useAuth()
  const userPerms = user?.permissions ?? []
  const items = SIDEBAR_ITEMS.filter((item) => hasAnyPermission(userPerms, item.requiresAny))

  return (
    <nav className="flex-1 space-y-1 px-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function Sidebar(): ReactElement {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <SidebarBrand />
      <SidebarNav />
      <div className="border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/60">
        Template DDD
      </div>
    </aside>
  )
}
