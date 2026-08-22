import * as SeparatorPrimitive from '@radix-ui/react-separator'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/shared/lib/cn'

export interface SeparatorProps
  extends Omit<ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>, 'className'> {
  className?: string
}

export function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      decorative={decorative}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}
