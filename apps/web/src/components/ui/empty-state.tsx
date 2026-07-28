import type { LucideIcon } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  size?: 'sm' | 'lg'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'lg',
  className,
  ...props
}: EmptyStateProps) {
  const isSm = size === 'sm'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isSm ? 'gap-2 py-8' : 'gap-3 py-16',
        className,
      )}
      {...props}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-primary/10 text-primary',
            isSm ? 'p-2.5' : 'p-3',
          )}
        >
          <Icon className={cn(isSm ? 'h-5 w-5' : 'h-6 w-6')} />
        </div>
      )}
      <h3 className={cn('font-semibold', isSm ? 'text-sm' : 'text-base')}>{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
EmptyState.displayName = 'EmptyState'
