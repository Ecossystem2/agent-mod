import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/cn'

import { Card, CardContent, CardHeader } from './card'

export interface StatCardTrend {
  value: string
  direction: 'up' | 'down' | 'neutral'
}

export interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  hint?: string
  trend?: StatCardTrend
  className?: string
}

const trendStyles: Record<StatCardTrend['direction'], string> = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
}

const trendIcons: Record<StatCardTrend['direction'], LucideIcon> = {
  up: ArrowUp,
  down: ArrowDown,
  neutral: Minus,
}

export function StatCard({ label, value, icon: Icon, hint, trend, className }: StatCardProps) {
  const TrendIcon = trend ? trendIcons[trend.direction] : null

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {(trend || hint) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend && TrendIcon && (
              <span className={cn('flex items-center gap-0.5 font-medium', trendStyles[trend.direction])}>
                <TrendIcon className="h-3 w-3" />
                {trend.value}
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
StatCard.displayName = 'StatCard'
