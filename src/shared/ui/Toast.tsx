import type { CSSProperties } from 'react'
import { Toaster as SonnerToaster } from 'sonner'

/*
 * Sonner's own stylesheet is unlayered, so it outranks the Tailwind utilities
 * in `classNames` on colour. Its `richColors` palette reads these variables
 * instead, which points a toast that opts into `richColors` at our tokens.
 */
const RICH_COLOR_TOKENS = {
  '--success-bg': 'var(--color-elevated)',
  '--success-border': 'var(--color-border)',
  '--success-text': 'var(--color-success)',
  '--error-bg': 'var(--color-elevated)',
  '--error-border': 'var(--color-border)',
  '--error-text': 'var(--color-danger)',
} as CSSProperties

/**
 * Mounted once, near the root.
 *
 * §11.6 — a toast confirms the action in the same words the button used:
 * "Saqlash" leads to "Saqlandi", not "Muvaffaqiyatli". Callers pass already
 * translated strings; nothing here is user-facing text.
 *
 * ⛔ Never put PHI in a toast. It outlives the screen it came from and is
 * visible to whoever walks past the reception desk (§13.4).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      // Long enough to read a sentence, short enough not to cover a table row.
      duration={5000}
      gap={8}
      style={RICH_COLOR_TOKENS}
      toastOptions={{
        classNames: {
          toast: [
            'flex items-center gap-3 rounded-card border border-border bg-elevated',
            'p-4 text-body text-text shadow-popover',
          ].join(' '),
          description: 'text-callout text-text-secondary',
          actionButton: 'rounded-control bg-accent px-3 py-1.5 text-callout text-on-accent',
          cancelButton: 'rounded-control bg-sunken px-3 py-1.5 text-callout text-text',
          error: 'text-danger',
          success: 'text-success',
          warning: 'text-warning',
        },
      }}
    />
  )
}

export { toast } from 'sonner'
