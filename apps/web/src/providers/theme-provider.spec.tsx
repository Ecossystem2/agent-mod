import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTheme } from './theme-context'
import { ThemeProvider } from './theme-provider'

// jsdom não implementa matchMedia — definimos um mock global antes dos testes
function defineMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function ThemeConsumer() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('light')}>light</button>
      <button onClick={() => setTheme('system')}>system</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
    // padrão: sistema é dark
    defineMatchMedia(true)
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
    vi.restoreAllMocks()
  })

  it('usa o tema padrão "system" quando não há nada no localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme').textContent).toBe('system')
  })

  it('lê o tema salvo no localStorage ao inicializar', () => {
    localStorage.setItem('theme', 'dark')

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('usa o defaultTheme quando fornecido e não há nada no localStorage', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('usa storageKey personalizado para ler e salvar o tema', () => {
    localStorage.setItem('custom-key', 'dark')

    render(
      <ThemeProvider storageKey="custom-key">
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })

  it('aplica classe "dark" no <html> ao definir tema dark', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'dark' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('aplica classe "light" no <html> ao definir tema light', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'light' }))

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('aplica o tema do sistema (dark) quando system e prefers-color-scheme é dark', async () => {
    const user = userEvent.setup({ delay: null })
    defineMatchMedia(true)

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'system' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('aplica o tema do sistema (light) quando system e prefers-color-scheme é light', async () => {
    const user = userEvent.setup({ delay: null })
    defineMatchMedia(false)

    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'system' }))

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
