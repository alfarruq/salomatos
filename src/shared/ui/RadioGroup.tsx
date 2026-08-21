import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import { useFieldControl } from './Field'

export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface RadioGroupProps {
  options: RadioOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
  /** Horizontal only for two short options — otherwise the labels crowd. */
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

export function RadioGroup({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled,
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  const field = useFieldControl()
  const groupId = useId()

  return (
    <RadioGroupPrimitive.Root
      {...(value === undefined ? {} : { value })}
      {...(defaultValue === undefined ? {} : { defaultValue })}
      {...(onValueChange === undefined ? {} : { onValueChange })}
      {...(name === undefined ? {} : { name })}
      disabled={disabled ?? false}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.isInvalid ?? undefined}
      className={cn(
        'flex gap-4',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className,
      )}
    >
      {options.map((option) => {
        const optionId = `${groupId}-${option.value}`

        return (
          <div className="flex items-start gap-3 pointer-coarse:min-h-11" key={option.value}>
            <RadioGroupPrimitive.Item
              id={optionId}
              value={option.value}
              disabled={option.disabled ?? false}
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                'border border-border-strong bg-surface',
                'transition-[border-color] duration-150 ease-out-apple',
                'data-[state=checked]:border-accent',
                'disabled:pointer-events-none disabled:opacity-40',
              )}
            >
              {/* A filled dot rather than a tick — a radio is one of many. */}
              <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-accent" />
            </RadioGroupPrimitive.Item>

            <label
              className={cn(
                'flex flex-col gap-1 select-none',
                option.disabled === true && 'opacity-40',
              )}
              htmlFor={optionId}
            >
              <span className="text-body text-text">{option.label}</span>
              {option.description ? (
                <span className="text-caption text-text-secondary">{option.description}</span>
              ) : null}
            </label>
          </div>
        )
      })}
    </RadioGroupPrimitive.Root>
  )
}
