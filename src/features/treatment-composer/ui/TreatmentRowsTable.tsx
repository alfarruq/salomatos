import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TreatmentStatus } from '@/entities/treatment'
import type { TreatmentType } from '@/entities/treatment-type'
import { cn } from '@/shared/lib/cn'
import { formatSom } from '@/shared/lib/money'
import { Button, digitsOf, MoneyInput, Select } from '@/shared/ui'
import type { TreatmentRow } from '../model/types'

export interface TreatmentRowsTableProps {
  rows: TreatmentRow[]
  treatmentTypes: TreatmentType[]
  onRowChange: (rowId: string, changes: Partial<TreatmentRow>) => void
  onRemoveRow: (rowId: string) => void
  /** Only meaningful for the one row with an `existingTreatmentId` — see the composer. */
  onExistingRowTypeChanged: () => void
  /** Off for a non-dental doctor, whose rows have no tooth to show. */
  showToothColumn: boolean
}

function debtOf(row: TreatmentRow): number {
  const cost = Number(digitsOf(row.totalCost) || '0')
  const paid = Number(digitsOf(row.totalPaid) || '0')
  return Math.max(cost - paid, 0)
}

/*
 * One grid template for the header and every row, so the columns line up
 * without a `<table>` — which could not reflow into the stacked card each
 * row becomes below `lg`, where six inputs side by side do not fit.
 */
const withTooth =
  'lg:grid-cols-[48px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_44px]'
const withoutTooth =
  'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_44px]'

/** Visible only on a phone, where the column header is gone; the header names it on desktop. */
function CellLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  const className = 'text-caption text-text-tertiary lg:sr-only'
  return htmlFor === undefined ? (
    <span className={className}>{children}</span>
  ) : (
    <label className={className} htmlFor={htmlFor}>
      {children}
    </label>
  )
}

function DebtAmount({ amount, children }: { amount: number; children: ReactNode }) {
  return (
    <span
      className={cn(
        'font-mono whitespace-nowrap tabular-nums',
        amount === 0 ? 'text-success' : 'text-warning',
      )}
    >
      {children}
    </span>
  )
}

/**
 * The per-tooth rows, added from `ToothPicker` above and edited here —
 * shared between the create and edit composer, per §6's rule against
 * building this table twice.
 */
export function TreatmentRowsTable({
  rows,
  treatmentTypes,
  onRowChange,
  onRemoveRow,
  onExistingRowTypeChanged,
  showToothColumn,
}: TreatmentRowsTableProps) {
  const { t, i18n } = useTranslation(['treatments', 'patients', 'common'])
  const currencyLabel = t('common:currency.som')
  const som = (amount: number) => formatSom(amount, i18n.language, currencyLabel)
  const typeOptions = treatmentTypes.map((type) => ({ value: String(type.id), label: type.name }))
  const statusOptions: { value: TreatmentStatus; label: string }[] = [
    { value: 'in_progress', label: t('patients:status.in_progress') },
    { value: 'completed', label: t('patients:status.completed') },
  ]
  const columns = showToothColumn ? withTooth : withoutTooth

  const totals = rows.reduce(
    (sum, row) => ({
      cost: sum.cost + Number(digitsOf(row.totalCost) || '0'),
      paid: sum.paid + Number(digitsOf(row.totalPaid) || '0'),
      debt: sum.debt + debtOf(row),
    }),
    { cost: 0, paid: 0, debt: 0 },
  )

  return (
    <section aria-labelledby="treatment-rows-title" className="flex flex-col gap-3">
      <h3 className="text-body font-semibold text-text" id="treatment-rows-title">
        {t('treatments:composer.rowsTitle', { total: rows.length })}
      </h3>

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-4 text-center text-callout text-text-secondary">
          {t('treatments:composer.rowsEmpty')}
        </p>
      ) : (
        <div className="flex flex-col gap-3 lg:gap-0">
          <div
            aria-hidden="true"
            className={cn(
              'hidden items-center gap-3 border-b border-border px-3 pb-2 text-caption text-text-tertiary lg:grid',
              columns,
            )}
          >
            {showToothColumn ? <span>{t('treatments:table.columnTooth')}</span> : null}
            <span>{t('treatments:composer.rowType')}</span>
            <span className="text-right">{t('treatments:composer.rowCost')}</span>
            <span className="text-right">{t('treatments:composer.rowPaid')}</span>
            <span>{t('treatments:composer.statusLabel')}</span>
            <span className="text-right">{t('treatments:table.columnDebt')}</span>
            <span />
          </div>

          <ul className="flex flex-col gap-3 lg:gap-0">
            {rows.map((row) => {
              const rowName =
                row.toothNumber === null
                  ? row.treatmentTypeName
                  : `${t('treatments:table.columnTooth')} ${row.toothNumber}`
              const debt = debtOf(row)

              return (
                <li
                  className={cn(
                    // Phone: a bordered card, two inputs per line.
                    'grid grid-cols-2 items-center gap-3 rounded-card border border-border p-3',
                    // Desktop: one dense line per row, separated like a table.
                    'lg:rounded-none lg:border-0 lg:border-b lg:px-3 lg:py-2',
                    columns,
                  )}
                  key={row.rowId}
                >
                  {/* Phone header line: tooth, type and delete share the top of the card. */}
                  <div className="col-span-2 flex items-center gap-3 lg:contents">
                    {showToothColumn ? (
                      row.toothNumber === null ? (
                        <span className="text-text-tertiary">—</span>
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-callout font-semibold text-accent-text">
                          {row.toothNumber}
                        </span>
                      )
                    ) : null}

                    <Select
                      aria-label={`${t('treatments:composer.rowType')} — ${rowName}`}
                      className="min-w-0 flex-1"
                      onValueChange={(value) => {
                        const type = treatmentTypes.find(
                          (candidate) => String(candidate.id) === value,
                        )
                        onRowChange(row.rowId, {
                          treatmentTypeId: type?.id ?? null,
                          treatmentTypeName: type?.name ?? row.treatmentTypeName,
                        })
                        if (row.existingTreatmentId !== null) onExistingRowTypeChanged()
                      }}
                      options={typeOptions}
                      size="sm"
                      {...(row.treatmentTypeName === ''
                        ? {}
                        : { placeholder: row.treatmentTypeName })}
                      {...(row.treatmentTypeId === null
                        ? {}
                        : { value: String(row.treatmentTypeId) })}
                    />

                    <Button
                      aria-label={`${t('common:action.delete')} — ${rowName}`}
                      className="shrink-0 lg:order-last"
                      onClick={() => onRemoveRow(row.rowId)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>

                  <div className="flex min-w-0 flex-col gap-1">
                    <CellLabel htmlFor={`${row.rowId}-cost`}>
                      {t('treatments:composer.rowCost')}
                    </CellLabel>
                    <MoneyInput
                      id={`${row.rowId}-cost`}
                      className="h-9 px-3 text-right text-callout pointer-coarse:min-h-11"
                      onChange={(value) => onRowChange(row.rowId, { totalCost: value })}
                      placeholder="0"
                      value={row.totalCost}
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-1">
                    <CellLabel htmlFor={`${row.rowId}-paid`}>
                      {t('treatments:composer.rowPaid')}
                    </CellLabel>
                    <MoneyInput
                      id={`${row.rowId}-paid`}
                      className="h-9 px-3 text-right text-callout pointer-coarse:min-h-11"
                      onChange={(value) => onRowChange(row.rowId, { totalPaid: value })}
                      placeholder="0"
                      value={row.totalPaid}
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-1">
                    <CellLabel>{t('treatments:composer.statusLabel')}</CellLabel>
                    <Select
                      aria-label={`${t('treatments:composer.statusLabel')} — ${rowName}`}
                      onValueChange={(value) =>
                        onRowChange(row.rowId, { status: value as TreatmentStatus })
                      }
                      options={statusOptions}
                      size="sm"
                      value={row.status}
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-1 lg:items-end">
                    <CellLabel>{t('treatments:table.columnDebt')}</CellLabel>
                    <span className="flex h-9 items-center text-callout">
                      <DebtAmount amount={debt}>{som(debt)}</DebtAmount>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>

          <dl className="mt-1 grid gap-2 rounded-card bg-sunken p-3 text-callout sm:grid-cols-3 sm:gap-3 lg:mt-3">
            <div className="flex min-w-0 items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
              <dt className="text-caption text-text-tertiary">
                {t('treatments:composer.rowCost')}
              </dt>
              <dd className="font-mono font-medium whitespace-nowrap text-text tabular-nums">
                {som(totals.cost)}
              </dd>
            </div>
            <div className="flex min-w-0 items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
              <dt className="text-caption text-text-tertiary">
                {t('treatments:composer.rowPaid')}
              </dt>
              <dd className="font-mono font-medium whitespace-nowrap text-text tabular-nums">
                {som(totals.paid)}
              </dd>
            </div>
            <div className="flex min-w-0 items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
              <dt className="text-caption text-text-tertiary">
                {t('treatments:table.columnDebt')}
              </dt>
              <dd className="font-medium">
                <DebtAmount amount={totals.debt}>{som(totals.debt)}</DebtAmount>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  )
}
