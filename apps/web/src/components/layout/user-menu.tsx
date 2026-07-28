import { LogOut } from 'lucide-react'
import { useState, type ReactElement } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useSignOut } from '@/features/auth/hooks/use-sign-out'
import { useAuth } from '@/providers/auth-context'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const [first, ...rest] = parts
  if (!first) return '?'
  const last = rest.at(-1)
  if (!last) return first.slice(0, 2).toUpperCase()
  return (first.charAt(0) + last.charAt(0)).toUpperCase()
}

export function UserMenu(): ReactElement | null {
  const { user } = useAuth()
  const signOut = useSignOut()
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu do usuário"
        onClick={() => {
          setOpen((v) => !v)
        }}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="hidden font-medium sm:block">{user.name}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar menu do usuário"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => {
              setOpen(false)
            }}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              disabled={signOut.isPending}
              onClick={() => {
                signOut.mutate()
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  )
}
