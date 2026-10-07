import * as PopoverPrimitive from '@radix-ui/react-popover'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TreatmentType } from '@/entities/treatment-type'
import { cn } from '@/shared/lib/cn'
import { DentalChart, type DentalChartLabels, Select } from '@/shared/ui'
import type { TreatmentRow } from '../model/types'

export interface ToothPickerProps {
  rows: TreatmentRow[]
  treatmentTypes: TreatmentType[]
  onAddTooth: (toothNumber: number, treatmentType: TreatmentType) => void
  onRemoveTooth: (toothNumber: number) => void
}

const SELECTED_STATUS = [
  { id: 'selected', fillClassName: 'fill-accent-soft', strokeClassName: 'stroke-accent' },
]

/**
 * The tooth-map half of the composer. Clicking an empty tooth opens a
 * popover anchored to that exact tooth — not to the chart, not to a trigger
 * button — so the picker reads as "pick a treatment *for this tooth*", which
 * a corner-anchored popover would not. Clicking a selected tooth removes its
 * row; everything else about the row (type, cost, paid) is edited in the
 * table below, not here.
 */
export function ToothPicker({ rows, treatmentTypes, onAddTooth, onRemoveTooth }: ToothPickerProps) {
  const { t } = useTranslation('treatments')
  const [pending, setPending] = useState<{ toothNumber: number; rect: DOMRect } | null>(null)

  const labels: DentalChartLabels = {
    incisor: t('composer.toothType.incisor'),
    canine: t('composer.toothType.canine'),
    premolar: t('composer.toothType.premolar'),
    molar: t('composer.toothType.molar'),
    upper: t('composer.toothType.upper'),
    lower: t('composer.toothType.lower'),
    tooth: t('composer.toothType.tooth'),
  }

  const values = Object.fromEntries(rows.map((row) => [String(row.toothNumber), 'selected']))

  const typeOptions = treatmentTypes.map((type) => ({ value: String(type.id), label: type.name }))

  return (
    <div className="flex flex-col items-center gap-3">
      <DentalChart
        labels={labels}
        onToothClick={(fdi, _event, element) => {
          const toothNumber = Number(fdi)
          const existing = rows.find((row) => row.toothNumber === toothNumber)
          if (existing !== undefined) {
            onRemoveTooth(toothNumber)
            return
          }
          setPending({ toothNumber, rect: element.getBoundingClientRect() })
        }}
        statuses={SELECTED_STATUS}
        values={values}
      />

      {rows.length === 0 && pending === null ? (
        <p className="text-caption text-text-secondary">{t('composer.toothHint')}</p>
      ) : null}

      {pending === null ? null : (
        <PopoverPrimitive.Root
          onOpenChange={(open) => {
            if (!open) setPending(null)
          }}
          open
        >
          <PopoverPrimitive.Anchor asChild>
            {/* A zero-size fixed point at the tooth's own centre — the
                anchor Radix positions the popover against, not the chart. */}
            <span
              className="pointer-events-none fixed"
              style={{
                left: pending.rect.left + pending.rect.width / 2,
                top: pending.rect.top + pending.rect.height / 2,
              }}
            />
          </PopoverPrimitive.Anchor>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              className={cn(
                'z-50 w-56',
                'rounded-card border border-border bg-elevated p-3 shadow-popover',
                'data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out',
              )}
              collisionPadding={16}
              sideOffset={8}
            >
              <Select
                onValueChange={(value) => {
                  const type = treatmentTypes.find((candidate) => String(candidate.id) === value)
                  if (type === undefined) return
                  onAddTooth(pending.toothNumber, type)
                  setPending(null)
                }}
                options={typeOptions}
                placeholder={t('composer.treatmentTypePlaceholder')}
                size="sm"
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      )}
    </div>
  )
}
