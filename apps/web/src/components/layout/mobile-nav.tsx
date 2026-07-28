import { Menu, X } from 'lucide-react'
import { useState, type ReactElement } from 'react'

import { Button } from '@/components/ui/button'

import { SidebarBrand, SidebarNav } from './sidebar'

export function MobileNav(): ReactElement {
  const [open, setOpen] = useState(false)
  const close = (): void => {
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Abrir menu de navegação"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Menu />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu de navegação"
            className="absolute inset-0 cursor-default bg-black/50"
            onClick={close}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <SidebarBrand />
              <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={close}>
                <X />
              </Button>
            </div>
            <SidebarNav onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  )
}
