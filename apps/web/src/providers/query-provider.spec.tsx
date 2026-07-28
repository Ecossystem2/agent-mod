import { screen , render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { QueryProvider } from './query-provider'

describe('QueryProvider', () => {
  it('renderiza os filhos dentro do provider', () => {
    render(
      <QueryProvider>
        <div>conteudo filho</div>
      </QueryProvider>,
    )

    expect(screen.getByText('conteudo filho')).toBeInTheDocument()
  })
})
