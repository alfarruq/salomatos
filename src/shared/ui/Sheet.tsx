import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface SheetProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  footer?: ReactNode
  trigger?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * A side panel for work that needs room but should not lose the page behind it
 * — a patient's details beside the list, filters beside a table.
 *
 * Built on the dialog primitive, so it inherits the focus trap, the Escape
 * handler and the scroll lock. Only the geometry differs.
 */
export function Sheet({
  open,
  defaultOpen,
  onOpenChange,
  title,
  description,
  footer,
  trigger,
  children,
  className,
}: SheetProps) {
  return (
    <DialogPrimitive.Root
      {...(open === undefined ? {} : { open })}
      {...(defaultOpen === undefined ? {} : { defaultOpen })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
    >
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-scrim',
            'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out',
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col',
            'border-l border-border bg-elevated shadow-popover',
            // Rounded on the leading edge only — it is attached to the viewport.
            'rounded-l-sheet',
            'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border p-6">
            <div className="flex flex-col gap-2">
              <DialogPrimitive.Title className="text-title2 text-text">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-callout text-text-secondary">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>

            <DialogPrimitive.Close
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-control',
                'text-text-secondary transition-colors duration-150 ease-out-apple',
                'hover:bg-sunken hover:text-text pointer-coarse:size-11',
              )}
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Yopish</span>
            </DialogPrimitive.Close>
          </div>

          {/* The body scrolls, the header and footer stay put. */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>

          {footer ? (
            <div className="flex justify-end gap-3 border-t border-border p-6">{footer}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
