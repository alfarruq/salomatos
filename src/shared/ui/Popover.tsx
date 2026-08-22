import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /**
   * Runs when the panel takes focus on open. Call `preventDefault()` to stop
   * Radix focusing the panel itself and place focus deliberately instead — a
   * grid with a roving tabindex has to, or the two compete.
   */
  onOpenAutoFocus?: (event: Event) => void
  className?: string
}

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  side = 'bottom',
  align = 'start',
  onOpenAutoFocus,
  className,
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
    >
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          {...(onOpenAutoFocus === undefined ? {} : { onOpenAutoFocus })}
          // Keeps the panel inside the viewport on a 360px screen instead of
          // letting it run off the edge (§11.7).
          collisionPadding={16}
          className={cn(
            'z-50 max-w-[calc(100vw-32px)]',
            'rounded-card border border-border bg-elevated p-4 shadow-popover',
            'data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out',
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
