import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeToggle } from './theme-toggle'

const setTheme = vi.fn()
const useThemeMock = vi.fn()

vi.mock('@/providers/theme-context', () => ({
  useTheme: () => useThemeMock() as unknown,
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('em light, avança para dark ao clicar', async () => {
    useThemeMock.mockReturnValue({ theme: 'light', setTheme })

    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button'))

    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('em dark, avança para system ao clicar', async () => {
    useThemeMock.mockReturnValue({ theme: 'dark', setTheme })

    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button'))

    expect(setTheme).toHaveBeenCalledWith('system')
  })

  it('em system, volta para light ao clicar', async () => {
    useThemeMock.mockReturnValue({ theme: 'system', setTheme })

    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button'))

    expect(setTheme).toHaveBeenCalledWith('light')
  })
})
