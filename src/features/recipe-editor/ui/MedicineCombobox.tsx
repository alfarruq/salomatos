import { Command } from 'cmdk'
import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { Popover, useFieldControl } from '@/shared/ui'
import { type CatalogMedicine, MEDICATION_CATALOG, MEDICATION_CATEGORIES } from '../model/catalog'

export interface MedicineComboboxProps {
  value: string
  onPick: (medicine: CatalogMedicine) => void
  /** A name the catalog does not have — the doctor is never limited to it. */
  onCustom: (name: string) => void
  /** Opens straight away — a freshly added row is waiting for its name. */
  defaultOpen?: boolean
  /** The table cell has no visible label of its own. */
  'aria-label'?: string
}

const itemClassName = cn(
  'flex cursor-default items-center gap-2 rounded-[8px] px-3 py-2',
  'text-body text-text select-none pointer-coarse:min-h-11',
  'data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-text',
)

export function MedicineCombobox({
  value,
  onPick,
  onCustom,
  defaultOpen = false,
  'aria-label': ariaLabel,
}: MedicineComboboxProps) {
  const { t } = useTranslation('recipes')
  const field = useFieldControl()
  const [open, setOpen] = useState(defaultOpen)
  const [search, setSearch] = useState('')

  const typed = search.trim()
  const isListed = MEDICATION_CATALOG.some(
    (medicine) => medicine.name.toLowerCase() === typed.toLowerCase(),
  )

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setSearch('')
  }

  function choose(apply: () => void) {
    apply()
    setOpen(false)
  }

  return (
    <Popover
      align="start"
      className="w-80 p-0"
      onOpenChange={handleOpenChange}
      open={open}
      trigger={
        <button
          aria-describedby={field?.describedBy}
          aria-label={ariaLabel}
          className={cn(
            'flex h-8 w-full items-center justify-between gap-2 rounded-control px-3 pointer-coarse:min-h-11',
            'border border-border bg-sunken text-left text-callout',
            'transition-[border-color] duration-150 ease-out-apple hover:border-border-strong',
            value === '' ? 'text-text-secondary' : 'text-text',
          )}
          id={field?.controlId}
          type="button"
        >
          <span className="truncate">{value === '' ? t('editor.namePlaceholder') : value}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />
        </button>
      }
    >
      <Command label={t('editor.nameLabel')}>
        <Command.Input
          className={cn(
            'w-full border-b border-border bg-transparent px-3 py-3',
            'text-body text-text outline-none placeholder:text-text-secondary',
          )}
          onValueChange={setSearch}
          placeholder={t('editor.searchPlaceholder')}
          value={search}
        />
        <Command.List className="max-h-72 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-2 text-caption text-text-secondary">
            {t('editor.notInCatalog')}
          </Command.Empty>

          {typed === '' || isListed ? null : (
            <Command.Item
              className={itemClassName}
              forceMount
              onSelect={() => choose(() => onCustom(typed))}
              value={`custom ${typed}`}
            >
              <Plus aria-hidden="true" className="size-4" />
              {t('editor.addCustom', { name: typed })}
            </Command.Item>
          )}

          {MEDICATION_CATEGORIES.map((category) => (
            <Command.Group
              className={cn(
                '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2',
                '[&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-text-tertiary',
              )}
              heading={t(`category.${category}`)}
              key={category}
            >
              {MEDICATION_CATALOG.filter((medicine) => medicine.category === category).map(
                (medicine) => (
                  <Command.Item
                    className={itemClassName}
                    key={medicine.name}
                    onSelect={() => choose(() => onPick(medicine))}
                    value={medicine.name}
                  >
                    {medicine.name}
                  </Command.Item>
                ),
              )}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </Popover>
  )
}
