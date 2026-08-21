import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/shared/lib/cn'
import { useFieldControl } from './Field'

export type InputSize = 'sm' | 'md'

export interface InputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size' | 'className'> {
  /** `sm` is the dense variant for tables and toolbars (§13 data density). */
  size?: InputSize
  className?: string
}

const sizes: Record<InputSize, string> = {
  sm: 'h-8 px-3 text-callout pointer-coarse:min-h-11',
  md: 'h-11 px-4 text-body',
}

export function Input({ size = 'md', id, className, ...props }: InputProps) {
  const field = useFieldControl()

  return (
    <input
      id={id ?? field?.controlId}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      aria-invalid={props['aria-invalid'] ?? field?.isInvalid ?? undefined}
      className={cn(
        'w-full rounded-control bg-sunken text-text',
        // The border is the structure; §11.1 prefers it over a shadow.
        'border border-border',
        /*
         * §11.7 and the contrast gate: text-tertiary does not reach AA on the
         * sunken background, so placeholders use the secondary level.
         */
        'placeholder:text-text-secondary',
        'transition-[border-color,background-color] duration-150 ease-out-apple',
        'hover:border-border-strong',
        'disabled:pointer-events-none disabled:opacity-40',
        // Invalid state is carried by aria-invalid, so the styling follows the
        // same source of truth the screen reader uses.
        'aria-invalid:border-danger',
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
