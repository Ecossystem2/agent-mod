import type { ReactElement } from 'react'

import { Button } from '@/components/ui/button'

interface LoadMoreProps {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

export function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: LoadMoreProps): ReactElement | null {
  if (!hasNextPage) return null

  return (
    <div className="flex justify-center">
      <Button
        variant="outline"
        className="h-11 w-full sm:w-auto"
        disabled={isFetchingNextPage}
        onClick={onLoadMore}
      >
        {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
      </Button>
    </div>
  )
}
