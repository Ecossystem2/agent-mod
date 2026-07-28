import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Header } from './header'

vi.mock('@/components/shared/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

vi.mock('./mobile-nav', () => ({
  MobileNav: () => <div data-testid="mobile-nav" />,
}))

vi.mock('./user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))

describe('Header', () => {
  it('renderiza navegação mobile, alternador de tema e menu do usuário', () => {
    render(<Header />)

    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
  })
})
