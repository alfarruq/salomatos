import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * Wrap the app once so every tooltip shares one delay timer — otherwise each
 * one waits its full delay again and the toolbar feels sluggish.
 */
export const TooltipProvider = TooltipPrimitive.Provider

export interface TooltipProps {
  /** Short label. A tooltip is never the only place information lives — it is
   * invisible to touch users and to anyone reading with a screen reader off. */
  content: string
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={16}
          className={cn(
            'z-50 max-w-64 rounded-control bg-text px-3 py-1.5',
            // Inverted: the tooltip reads as a layer above the interface.
            'text-caption text-surface',
            'data-[state=delayed-open]:animate-popover-in',
            'data-[state=closed]:animate-popover-out',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
