import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}

export function DropdownMenu({ trigger, children, align = 'end', className }: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={6}
          collisionPadding={16}
          className={cn(
            'z-50 min-w-48 max-w-[calc(100vw-32px)]',
            'rounded-card border border-border bg-elevated p-1 shadow-popover',
            'data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out',
            className,
          )}
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export interface DropdownMenuItemProps {
  onSelect?: () => void
  disabled?: boolean
  /** Destructive actions only — §13 reserves red for deletion. */
  isDestructive?: boolean
  iconLeft?: ReactNode
  children: ReactNode
}

export function DropdownMenuItem({
  onSelect,
  disabled = false,
  isDestructive = false,
  iconLeft,
  children,
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      disabled={disabled}
      {...(onSelect === undefined ? {} : { onSelect })}
      className={cn(
        'flex cursor-default items-center gap-3 rounded-[8px] px-3 py-2',
        'text-body outline-none select-none',
        // Radix drives `highlighted` from keyboard and pointer alike, so arrow
        // keys and the mouse land on the same visual state.
        isDestructive
          ? 'text-danger data-[highlighted]:bg-danger/10'
          : 'text-text data-[highlighted]:bg-sunken',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        'pointer-coarse:min-h-11',
      )}
    >
      {iconLeft}
      {children}
    </DropdownMenuPrimitive.Item>
  )
}

export function DropdownMenuSeparator() {
  return <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenuPrimitive.Label className="px-3 py-2 text-caption text-text-tertiary">
      {children}
    </DropdownMenuPrimitive.Label>
  )
}
