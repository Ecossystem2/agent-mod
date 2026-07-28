import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ThemeContext, useTheme } from './theme-context'

import type { ThemeContextValue } from './theme-context'

describe('useTheme', () => {
  it('lança erro quando usado fora do ThemeProvider', () => {
    function Consumer() {
      useTheme()
      return null
    }

    expect(() => render(<Consumer />)).toThrow(
      'useTheme deve ser usado dentro de <ThemeProvider />',
    )
  })

  it('retorna o valor do contexto quando usado dentro do ThemeProvider', () => {
    const value: ThemeContextValue = {
      theme: 'dark',
      setTheme: vi.fn(),
    }

    function Consumer() {
      const { theme } = useTheme()
      return <div>{theme}</div>
    }

    render(
      <ThemeContext.Provider value={value}>
        <Consumer />
      </ThemeContext.Provider>,
    )

    expect(screen.getByText('dark')).toBeInTheDocument()
  })
})
