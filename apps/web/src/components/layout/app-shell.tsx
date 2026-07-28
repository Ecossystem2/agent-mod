import { Outlet } from 'react-router-dom'

import type { ReactElement } from 'react'

import { Header } from './header'
import { Sidebar } from './sidebar'

export function AppShell(): ReactElement {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
