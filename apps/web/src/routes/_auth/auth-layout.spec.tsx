import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AuthLayout } from './auth-layout'

describe('AuthLayout', () => {
  it('renderiza o conteúdo da rota filha via Outlet', () => {
    render(
      <MemoryRouter initialEntries={['/sign-in']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/sign-in" element={<div>pagina de login</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('pagina de login')).toBeInTheDocument()
  })
})
