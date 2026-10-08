import { useTranslation } from 'react-i18next'
import type { Treatment } from '@/entities/treatment'
import { TreatmentStatusBadge } from '@/entities/treatment'
import type { CalendarDate } from '@/shared/lib/calendarDate'
import { formatSom } from '@/shared/lib/money'
import { Button, Card, Dialog } from '@/shared/ui'

export interface TreatmentDetailDialogProps {
  treatment: Treatment
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  onTakePayment: () => void
}

/** Shown when the server had nothing to send for a field. */
const EMPTY = '—'

/** Fixed, not locale-dependent — see `TreatmentHistoryTable`'s identical helper. */
function toFixedDate(value: CalendarDate): string {
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

/** Read-only — "Batafsil" from the history table and from the double-clicked tooth badge. */
export function TreatmentDetailDialog({
  treatment,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onComplete,
  onTakePayment,
}: TreatmentDetailDialogProps) {
  const { t, i18n } = useTranslation(['treatments', 'common'])
  const currencyLabel = t('common:currency.som')
  const debt = Math.max(treatment.remaining ?? 0, 0)

  return (
    <Dialog
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <button
            className="text-callout text-danger hover:underline"
            onClick={onDelete}
            type="button"
          >
            {t('treatments:detail.delete')}
          </button>

          <div className="flex flex-wrap gap-2">
            {treatment.status === 'completed' ? null : (
              <Button onClick={onComplete} variant="secondary">
                {t('treatments:detail.complete')}
              </Button>
            )}
            {debt === 0 ? null : (
              <Button onClick={onTakePayment} variant="secondary">
                {t('treatments:detail.takePayment')}
              </Button>
            )}
            <Button onClick={onEdit} variant="primary">
              {t('treatments:detail.edit')}
            </Button>
          </div>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t('treatments:detail.title')}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-callout font-medium text-text">
            {t('treatments:detail.toothLabel', { tooth: treatment.toothNumber ?? EMPTY })} —{' '}
            {treatment.treatmentTypeName ?? EMPTY}
          </h3>
          <TreatmentStatusBadge status={treatment.status} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <p className="text-caption text-text-tertiary">{t('treatments:detail.dateLabel')}</p>
            <p className="text-callout text-text">
              {treatment.startDate === null ? EMPTY : toFixedDate(treatment.startDate)}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-caption text-text-tertiary">{t('treatments:detail.doctorLabel')}</p>
            <p className="text-callout text-text">{treatment.doctorName ?? EMPTY}</p>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <p className="text-caption text-text-tertiary">
              {t('treatments:detail.totalCostLabel')}
            </p>
            <p className="text-callout text-text">
              {treatment.totalTreatmentCost === null
                ? EMPTY
                : formatSom(treatment.totalTreatmentCost, i18n.language, currencyLabel)}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-caption text-text-tertiary">
              {t('treatments:detail.totalPaidLabel')}
            </p>
            <p className="text-callout text-success">
              {treatment.totalPaid === null
                ? EMPTY
                : formatSom(treatment.totalPaid, i18n.language, currencyLabel)}
            </p>
          </Card>
          <Card className={debt > 0 ? 'bg-danger/10 p-3' : 'p-3'}>
            <p className="text-caption text-text-tertiary">
              {t('treatments:detail.remainingLabel')}
            </p>
            <p
              className={
                debt > 0 ? 'text-callout font-semibold text-danger' : 'text-callout text-text'
              }
            >
              {formatSom(debt, i18n.language, currencyLabel)}
            </p>
          </Card>
        </div>

        {treatment.notes === null || treatment.notes === '' ? null : (
          <Card className="p-3">
            <p className="text-caption text-text-tertiary">{t('treatments:detail.notesLabel')}</p>
            <p className="text-callout text-text">{treatment.notes}</p>
          </Card>
        )}
      </div>
    </Dialog>
  )
}
