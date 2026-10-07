import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TreatmentType } from '@/entities/treatment-type'
import { formatSom } from '@/shared/lib/money'
import {
  Button,
  digitsOf,
  MoneyInput,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui'
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
  const { t, i18n } = useTranslation(['treatments', 'common'])
  const currencyLabel = t('common:currency.som')
  const typeOptions = treatmentTypes.map((type) => ({ value: String(type.id), label: type.name }))

  const totals = rows.reduce(
    (sum, row) => ({
      cost: sum.cost + Number(digitsOf(row.totalCost) || '0'),
      paid: sum.paid + Number(digitsOf(row.totalPaid) || '0'),
      debt: sum.debt + debtOf(row),
    }),
    { cost: 0, paid: 0, debt: 0 },
  )

  return (
    <Table density="compact">
      <TableHeader>
        <TableRow>
          {showToothColumn ? <TableHead>{t('treatments:table.columnTooth')}</TableHead> : null}
          <TableHead>{t('treatments:composer.rowType')}</TableHead>
          <TableHead align="right">{t('treatments:composer.rowCost')}</TableHead>
          <TableHead align="right">{t('treatments:composer.rowPaid')}</TableHead>
          <TableHead align="right">{t('treatments:table.columnDebt')}</TableHead>
          <TableHead align="right">{t('treatments:table.columnActions')}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.rowId}>
            {showToothColumn ? (
              <TableCell>
                {row.toothNumber === null ? (
                  <span className="text-text-tertiary">—</span>
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-callout font-medium text-accent-text">
                    {row.toothNumber}
                  </span>
                )}
              </TableCell>
            ) : null}
            <TableCell>
              <Select
                onValueChange={(value) => {
                  const type = treatmentTypes.find((candidate) => String(candidate.id) === value)
                  onRowChange(row.rowId, {
                    treatmentTypeId: type?.id ?? null,
                    treatmentTypeName: type?.name ?? row.treatmentTypeName,
                  })
                  if (row.existingTreatmentId !== null) onExistingRowTypeChanged()
                }}
                options={typeOptions}
                size="sm"
                {...(row.treatmentTypeName === '' ? {} : { placeholder: row.treatmentTypeName })}
                {...(row.treatmentTypeId === null ? {} : { value: String(row.treatmentTypeId) })}
              />
            </TableCell>
            <TableCell align="right">
              <MoneyInput
                className="text-right"
                onChange={(value) => onRowChange(row.rowId, { totalCost: value })}
                value={row.totalCost}
              />
            </TableCell>
            <TableCell align="right">
              <MoneyInput
                className="text-right"
                onChange={(value) => onRowChange(row.rowId, { totalPaid: value })}
                value={row.totalPaid}
              />
            </TableCell>
            <TableCell align="right" isNumeric>
              {formatSom(debtOf(row), i18n.language, currencyLabel)}
            </TableCell>
            <TableCell align="right">
              <Button
                aria-label={`${t('common:action.delete')} — ${
                  row.toothNumber === null
                    ? row.treatmentTypeName
                    : `${t('treatments:table.columnTooth')} ${row.toothNumber}`
                }`}
                onClick={() => onRemoveRow(row.rowId)}
                size="sm"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>

      {rows.length === 0 ? null : (
        <tfoot>
          <TableRow className="font-medium">
            <TableCell className="text-text-secondary" colSpan={showToothColumn ? 2 : 1}>
              {t('treatments:composer.totalsLabel')}
            </TableCell>
            <TableCell align="right" isNumeric>
              {formatSom(totals.cost, i18n.language, currencyLabel)}
            </TableCell>
            <TableCell align="right" isNumeric>
              {formatSom(totals.paid, i18n.language, currencyLabel)}
            </TableCell>
            <TableCell align="right" isNumeric>
              {formatSom(totals.debt, i18n.language, currencyLabel)}
            </TableCell>
            <TableCell />
          </TableRow>
        </tfoot>
      )}
    </Table>
  )
}
