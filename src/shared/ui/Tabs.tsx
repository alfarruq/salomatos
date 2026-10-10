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
      <TabsPrimitive.List className="flex gap-1 overflow-x-auto border-b border-border">
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
