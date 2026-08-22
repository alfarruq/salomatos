import { Loader2 } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'className'> {
  variant?: ButtonVariant
  /** `sm` is the dense variant for tables and toolbars (§13 data density). */
  size?: ButtonSize
  /** Blocks interaction and announces the wait, keeping the label in place. */
  isLoading?: boolean
  iconLeft?: ReactNode
  className?: string
}

const base = [
  'relative inline-flex items-center justify-center gap-2',
  'rounded-control font-medium whitespace-nowrap select-none',
  // §11.5 — name the properties. `transition: all` is forbidden.
  'transition-[background-color,border-color,color,opacity] duration-150 ease-out-apple',
  'disabled:pointer-events-none disabled:opacity-40',
].join(' ')

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface text-text border border-border hover:bg-sunken',
  ghost: 'text-accent-text hover:bg-accent-soft',
  // §13 — red means deletion, never emphasis.
  danger: 'bg-danger-fill text-on-danger hover:bg-danger-hover',
}

const sizes: Record<ButtonSize, string> = {
  /*
   * The dense variant is 32px tall so a staff member sees more rows at once,
   * but §11.7 still requires a 44px target wherever a finger is the pointer —
   * hence the coarse-pointer floor rather than a blanket 44px.
   */
  sm: 'h-8 px-3 text-callout pointer-coarse:min-h-11',
  md: 'h-11 px-4 text-body',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  iconLeft,
  disabled,
  children,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      // An unspecified `type` inside a form defaults to submit and fires it by
      // accident — a real hazard on a long clinical form.
      type={type}
      disabled={disabled === true || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
      ) : (
        iconLeft
      )}
      {children}
    </button>
  )
}
