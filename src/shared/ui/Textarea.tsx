import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/shared/lib/cn'
import { useFieldControl } from './Field'

export interface TextareaProps extends Omit<ComponentPropsWithoutRef<'textarea'>, 'className'> {
  className?: string
}

export function Textarea({ id, rows = 4, className, ...props }: TextareaProps) {
  const field = useFieldControl()

  return (
    <textarea
      id={id ?? field?.controlId}
      rows={rows}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      aria-invalid={props['aria-invalid'] ?? field?.isInvalid ?? undefined}
      className={cn(
        'w-full rounded-control border border-border bg-sunken px-4 py-3 text-body text-text',
        // Vertical only: horizontal resize breaks the column layout of a form.
        'resize-y',
        'placeholder:text-text-secondary',
        'transition-[border-color] duration-150 ease-out-apple',
        'hover:border-border-strong',
        'disabled:pointer-events-none disabled:opacity-40',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  )
}
