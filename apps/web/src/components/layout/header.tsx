import type { ReactElement } from 'react'

import { ThemeToggle } from '@/components/shared/theme-toggle'

import { MobileNav } from './mobile-nav'
import { UserMenu } from './user-menu'

export function Header(): ReactElement {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <MobileNav />
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
