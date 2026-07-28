import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import {
  forwardRef,
  type ComponentProps,
  type HTMLAttributes,
  type ReactElement,
} from 'react'

import { cn } from '@/lib/cn'

import { buttonVariants } from './button'

export function Pagination({ className, ...props }: ComponentProps<'nav'>): ReactElement {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}
Pagination.displayName = 'Pagination'

export const PaginationContent = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  ),
)
PaginationContent.displayName = 'PaginationContent'

export const PaginationItem = forwardRef<HTMLLIElement, HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('', className)} {...props} />,
)
PaginationItem.displayName = 'PaginationItem'

type PaginationLinkProps = {
  isActive?: boolean
  size?: 'default' | 'sm' | 'lg' | 'icon'
} & ComponentProps<'a'>

export function PaginationLink({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps): ReactElement {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        buttonVariants({ variant: isActive ? 'outline' : 'ghost', size }),
        className,
      )}
      {...props}
    />
  )
}
PaginationLink.displayName = 'PaginationLink'

export function PaginationPrevious({
  className,
  ...props
}: ComponentProps<typeof PaginationLink>): ReactElement {
  return (
    <PaginationLink
      aria-label="Ir para a página anterior"
      size="default"
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>Anterior</span>
    </PaginationLink>
  )
}
PaginationPrevious.displayName = 'PaginationPrevious'

export function PaginationNext({
  className,
  ...props
}: ComponentProps<typeof PaginationLink>): ReactElement {
  return (
    <PaginationLink
      aria-label="Ir para a próxima página"
      size="default"
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      <span>Próxima</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  )
}
PaginationNext.displayName = 'PaginationNext'

export function PaginationEllipsis({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>): ReactElement {
  return (
    <span
      aria-hidden
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Mais páginas</span>
    </span>
  )
}
PaginationEllipsis.displayName = 'PaginationEllipsis'
