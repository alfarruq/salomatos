import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { type ComponentPropsWithoutRef, useId } from 'react'
import { cn } from '@/shared/lib/cn'

export interface CheckboxProps
  extends Omit<ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'className' | 'children'> {
  /** Rendered beside the box and wired to it, so the text is part of the target. */
  label: string
  className?: string
}

export function Checkbox({ label, id, disabled, className, ...props }: CheckboxProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        // §11.7 — the row is the hit target on touch, not the 20px box.
        'pointer-coarse:min-h-11',
        className,
      )}
    >
      <CheckboxPrimitive.Root
        id={controlId}
        disabled={disabled}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-[6px]',
          'border border-border-strong bg-surface',
          'transition-[background-color,border-color] duration-150 ease-out-apple',
          'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
          'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
          'disabled:pointer-events-none disabled:opacity-40',
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="text-on-accent">
          {props.checked === 'indeterminate' ? (
            <Minus aria-hidden="true" className="size-3.5" strokeWidth={3} />
          ) : (
            <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      <label
        className={cn('text-body text-text select-none', disabled === true && 'opacity-40')}
        htmlFor={controlId}
      >
        {label}
      </label>
    </div>
  )
}
