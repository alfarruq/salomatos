import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface TabItem {
  value: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function Tabs({ items, value, defaultValue, onValueChange, className }: TabsProps) {
  // Falls back to the first tab, but `items` can legitimately be empty (a
  // permission-filtered tab list), so an absent value stays absent.
  const initialValue = defaultValue ?? items[0]?.value

  return (
    <TabsPrimitive.Root
      {...(value === undefined ? {} : { value })}
      {...(initialValue === undefined ? {} : { defaultValue: initialValue })}
      {...(onValueChange === undefined ? {} : { onValueChange })}
      className={cn('flex flex-col gap-6', className)}
    >
      {/* Phones get a segmented control: an underline row of four tabs reads as
          page chrome there, and the thumb needs a bigger target than text. */}
      <TabsPrimitive.List className="flex gap-1 overflow-x-auto border-b border-border max-sm:rounded-control max-sm:gap-0 max-sm:border-b-0 max-sm:bg-sunken max-sm:p-1">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled ?? false}
            className={cn(
              'relative px-4 py-3 text-callout font-medium whitespace-nowrap',
              'text-text-secondary transition-colors duration-150 ease-out-apple',
              'hover:text-text',
              'data-[state=active]:text-text',
              // The indicator is an inset border so the tab does not shift by a
              // pixel when it becomes active.
              'data-[state=active]:shadow-[inset_0_-2px_0_0_var(--color-accent)]',
              'disabled:pointer-events-none disabled:opacity-40',
              'pointer-coarse:min-h-11',
              'max-sm:flex-1 max-sm:rounded-control max-sm:px-2 max-sm:py-2 max-sm:text-caption',
              'max-sm:data-[state=active]:bg-surface max-sm:data-[state=active]:shadow-[inset_0_0_0_1px_var(--color-border)]',
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}
