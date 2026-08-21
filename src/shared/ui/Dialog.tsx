import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Announced as the dialog's name. Required — an unnamed dialog is unusable. */
  title: string
  /** Optional supporting line, wired to aria-describedby. */
  description?: string
  /** Buttons row. Confirm goes last, matching the reading order. */
  footer?: ReactNode
  /**
   * Blocks dismissal by Escape, overlay click and the close button. Only for
   * a step that genuinely must not be abandoned halfway.
   */
  isDismissDisabled?: boolean
  /**
   * Element that opens the dialog. Rendered inside the Root — a trigger placed
   * outside it would not be connected to anything.
   * Omit it when a feature drives `open` from its own state.
   */
  trigger?: ReactNode
  children?: ReactNode
  className?: string
}

/** Closes the dialog from inside it — use it on the footer's cancel button. */
export const DialogClose = DialogPrimitive.Close

export function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  title,
  description,
  footer,
  isDismissDisabled = false,
  trigger,
  children,
  className,
}: DialogProps) {
  const blockDismiss = (event: Event) => {
    if (isDismissDisabled) event.preventDefault()
  }

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
          onEscapeKeyDown={blockDismiss}
          onPointerDownOutside={blockDismiss}
          onInteractOutside={blockDismiss}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'flex w-[calc(100vw-32px)] max-w-lg flex-col gap-6',
            // §11.7 — a dialog taller than the viewport must still scroll on a
            // 360px phone rather than trap its own footer offscreen.
            'max-h-[calc(100dvh-32px)] overflow-y-auto',
            'rounded-card border border-border bg-elevated p-6 shadow-popover',
            'data-[state=open]:animate-modal-in data-[state=closed]:animate-modal-out',
            className,
          )}
        >
          <div className="flex flex-col gap-2 pr-8">
            <DialogPrimitive.Title className="text-title2 text-text">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-callout text-text-secondary">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>

          {children}

          {footer ? <div className="flex justify-end gap-3">{footer}</div> : null}

          {isDismissDisabled ? null : (
            <DialogPrimitive.Close
              className={cn(
                'absolute top-4 right-4 flex size-8 items-center justify-center',
                'rounded-control text-text-secondary',
                'transition-colors duration-150 ease-out-apple hover:bg-sunken hover:text-text',
                'pointer-coarse:size-11',
              )}
            >
              <X aria-hidden="true" className="size-4" />
              {/* Named for assistive tech; the glyph alone says nothing. */}
              <span className="sr-only">Yopish</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
