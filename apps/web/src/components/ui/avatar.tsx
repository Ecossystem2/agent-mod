import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from 'react'

import { cn } from '@/lib/cn'

export const Avatar = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    />
  ),
)
Avatar.displayName = 'Avatar'

export const AvatarImage = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, onError, ...props }, ref) => {
    const [hidden, setHidden] = useState(false)

    if (hidden) return null

    return (
      <img
        ref={ref}
        className={cn('aspect-square h-full w-full object-cover', className)}
        onError={(event: SyntheticEvent<HTMLImageElement>) => {
          setHidden(true)
          onError?.(event)
        }}
        {...props}
      />
    )
  },
)
AvatarImage.displayName = 'AvatarImage'

export const AvatarFallback = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  ),
)
AvatarFallback.displayName = 'AvatarFallback'
