import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/shared/lib/cn'

export interface SkeletonProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className'> {
  className?: string
}

/**
 * The loading state (§15) — a skeleton, never a spinner, so the layout does not
 * jump when the data arrives.
 *
 * `aria-hidden` on purpose: a screen reader user gets the busy state from the
 * region that owns the query, not from a stack of decorative bars.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-control bg-sunken', className)}
      {...props}
    />
  )
}
