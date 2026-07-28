import { Outlet } from 'react-router-dom'

import type { ReactElement } from 'react'

export function AuthLayout(): ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Outlet />
    </div>
  )
}
