import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/shared/lib/cn'

export interface CardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className'> {
  className?: string
}

/**
 * §11.1 — structure comes from a border, not a shadow. The shadow token is
 * there for depth against the canvas, deliberately almost invisible.
 */
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface shadow-card',
        // Padding is the caller's call: a card wrapping a table needs none.
        className,
      )}
      {...props}
    />
  )
}
