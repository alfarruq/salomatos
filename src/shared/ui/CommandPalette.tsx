import { Command } from 'cmdk'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { cn } from '@/shared/lib/cn'

export interface CommandItem {
  id: string
  label: string
  /** Extra terms that should match, e.g. an English name for an Uzbek label. */
  keywords?: string[]
  icon?: ReactNode
  /** Right-aligned hint: a shortcut, a section name. Never PHI. */
  hint?: string
  onSelect: () => void
}

export interface CommandGroup {
  label: string
  items: CommandItem[]
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: CommandGroup[]
  placeholder: string
  emptyLabel: string
  /** Accessible name for the dialog. */
  label: string
}

/**
 * ⌘K navigation.
 *
 * ⛔ The query lives in component state and nowhere else — never in the URL,
 * never in storage (§3 of CLAUDE.md). Staff will type patient names in here,
 * and a name in a URL leaks through server logs, Referer, history and screen
 * sharing. `hint` is shown next to results for the same reason: it is for
 * shortcuts and sections, not for a phone number.
 */
export function CommandPalette({
  open,
  onOpenChange,
  groups,
  placeholder,
  emptyLabel,
  label,
}: CommandPaletteProps) {
  return (
    <Command.Dialog
      label={label}
      onOpenChange={onOpenChange}
      open={open}
      // cmdk filters on the rendered label plus keywords; no request is made
      // as the user types unless a caller wires one up.
      className={cn(
        'fixed top-[20%] left-1/2 z-50 w-[calc(100vw-32px)] max-w-lg -translate-x-1/2',
        'overflow-hidden rounded-card border border-border bg-elevated shadow-popover',
        'data-[state=open]:animate-modal-in',
      )}
      overlayClassName="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-overlay-in"
    >
      <Command.Input
        className={cn(
          'w-full border-b border-border bg-transparent px-4 py-4',
          'text-body text-text outline-none placeholder:text-text-secondary',
        )}
        placeholder={placeholder}
      />

      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-callout text-text-secondary">
          {emptyLabel}
        </Command.Empty>

        {groups.map((group) => (
          <Command.Group
            key={group.label}
            heading={group.label}
            className={cn(
              '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2',
              '[&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-text-tertiary',
            )}
          >
            {group.items.map((item) => (
              <Command.Item
                key={item.id}
                value={`${item.label} ${(item.keywords ?? []).join(' ')}`}
                onSelect={() => {
                  item.onSelect()
                  onOpenChange(false)
                }}
                className={cn(
                  'flex cursor-default items-center gap-3 rounded-[8px] px-3 py-2',
                  'text-body text-text select-none',
                  // cmdk drives this from both keyboard and pointer, so the two
                  // never disagree about what is highlighted.
                  'data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-text',
                  'pointer-coarse:min-h-11',
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.hint ? (
                  <span className="text-caption text-text-tertiary">{item.hint}</span>
                ) : null}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  )
}

/**
 * Opens the palette on ⌘K / Ctrl+K.
 *
 * Ignores the shortcut while the user is typing in a field — a receptionist
 * halfway through an address should not lose it to a stray modifier.
 */
export function useCommandShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'k' || !(event.metaKey || event.ctrlKey)) return

      const target = event.target
      const isEditing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (isEditing) return

      event.preventDefault()
      onOpen()
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onOpen])
}
