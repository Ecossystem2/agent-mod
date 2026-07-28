import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LoadMore } from './load-more'

import { renderWithProviders } from '@/test/render-with-providers'

describe('LoadMore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não renderiza nada quando hasNextPage é false', () => {
    const { container } = renderWithProviders(
      <LoadMore hasNextPage={false} isFetchingNextPage={false} onLoadMore={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza o botão "Carregar mais" quando hasNextPage é true', () => {
    renderWithProviders(
      <LoadMore hasNextPage isFetchingNextPage={false} onLoadMore={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeEnabled()
  })

  it('chama onLoadMore ao clicar', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <LoadMore hasNextPage isFetchingNextPage={false} onLoadMore={onLoadMore} />,
    )

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('desabilita o botão e exibe "Carregando..." durante o fetch', () => {
    renderWithProviders(
      <LoadMore hasNextPage isFetchingNextPage onLoadMore={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled()
  })
})
