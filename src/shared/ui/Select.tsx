import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { useFieldControl } from './Field'

export type SelectSize = 'sm' | 'md'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  /** `sm` is the dense variant for tables and toolbars (§13 data density). */
  size?: SelectSize
  disabled?: boolean
  name?: string
  id?: string
  className?: string
}

const sizes: Record<SelectSize, string> = {
  sm: 'h-8 px-3 text-callout pointer-coarse:min-h-11',
  md: 'h-11 px-4 text-body',
}

function Item({ option }: { option: SelectOption }): ReactNode {
  return (
    <SelectPrimitive.Item
      value={option.value}
      disabled={option.disabled ?? false}
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-[8px] py-2 pr-8 pl-3',
        'text-body text-text outline-none select-none',
        // Radix drives highlight from keyboard and pointer alike, so arrow keys
        // and the mouse produce the same visual state.
        'data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-text',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      )}
    >
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3">
        <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  size = 'md',
  disabled,
  name,
  id,
  className,
}: SelectProps) {
  const field = useFieldControl()

  return (
    <SelectPrimitive.Root
      {...(value === undefined ? {} : { value })}
      {...(defaultValue === undefined ? {} : { defaultValue })}
      {...(onValueChange === undefined ? {} : { onValueChange })}
      {...(name === undefined ? {} : { name })}
      disabled={disabled ?? false}
    >
      <SelectPrimitive.Trigger
        id={id ?? field?.controlId}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.isInvalid ?? undefined}
        className={cn(
          'flex w-full items-center justify-between gap-2',
          'rounded-control border border-border bg-sunken text-text',
          'transition-[border-color] duration-150 ease-out-apple',
          'hover:border-border-strong',
          'disabled:pointer-events-none disabled:opacity-40',
          'aria-invalid:border-danger',
          // Placeholder uses the secondary level — tertiary does not reach AA
          // on the sunken background.
          'data-[placeholder]:text-text-secondary',
          sizes[size],
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-card border border-border bg-elevated p-1 shadow-popover',
          )}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <Item key={option.value} option={option} />
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
