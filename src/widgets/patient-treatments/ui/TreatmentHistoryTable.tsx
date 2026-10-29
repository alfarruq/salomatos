import { useQuery } from '@tanstack/react-query'
import { MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Treatment } from '@/entities/treatment'
import { TreatmentStatusBadge, treatmentQueries } from '@/entities/treatment'
import { formatFixedDate } from '@/shared/lib/calendarDate'
import { formatSom } from '@/shared/lib/money'
import { PHONE_QUERY, useMediaQuery } from '@/shared/lib/useMediaQuery'
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuItem,
  EmptyState,
  ErrorState,
  QueryBoundary,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/shared/ui'
import { TreatmentDetailDialog } from './TreatmentDetailDialog'

export interface TreatmentHistoryTableProps {
  clinicId: number
  patientId: number
  onCreate: () => void
  onEdit: (treatment: Treatment) => void
  onComplete: (treatment: Treatment) => void
  onDelete: (treatment: Treatment) => void
  onTakePayment: (treatment: Treatment) => void
}

/** Shown when the server had nothing to send for a cell. */
const EMPTY = '—'

/**
 * The patient's full treatment history, with the actions that manage it.
 *
 * A widget rather than an entity component (§3.1): the dropdown composes
 * features — editing, completing, deleting — none of which an entity may
 * import directly.
 */
export function TreatmentHistoryTable({
  clinicId,
  patientId,
  onCreate,
  onEdit,
  onComplete,
  onDelete,
  onTakePayment,
}: TreatmentHistoryTableProps) {
  const { t, i18n } = useTranslation(['treatments', 'patients', 'common'])
  const query = useQuery(treatmentQueries.list(clinicId, patientId))
  const [detailTreatment, setDetailTreatment] = useState<Treatment | null>(null)
  const isPhone = useMediaQuery(PHONE_QUERY)

  return (
    <div className="flex flex-col gap-4">
      <QueryBoundary
        empty={
          <EmptyState
            action={
              <Button onClick={onCreate} variant="primary">
                {t('treatments:table.emptyAction')}
              </Button>
            }
            description={t('treatments:table.emptyDescription')}
            title={t('treatments:table.empty')}
          />
        }
        error={({ retry }) => (
          <ErrorState
            description={t('common:error.pageBody')}
            retryLabel={t('common:action.retry')}
            title={t('common:error.pageTitle')}
            {...(retry === undefined ? {} : { onRetry: retry })}
          />
        )}
        loading={
          <Table density="compact">
            <TableSkeleton columns={7} rows={4} />
          </Table>
        }
        query={query}
      >
        {(treatments) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">
                  {t('treatments:table.totalLabel')}: {treatments.length}
                </Badge>
                <Badge tone="accent">
                  {t('treatments:table.inProgressLabel')}:{' '}
                  {treatments.filter((t) => t.status === 'in_progress').length}
                </Badge>
                <Badge tone="success">
                  {t('treatments:table.completedLabel')}:{' '}
                  {treatments.filter((t) => t.status === 'completed').length}
                </Badge>
              </div>

              <Button onClick={onCreate} size="sm" variant="primary">
                {t('patients:detail.newTreatment')}
              </Button>
            </div>

            {isPhone ? (
              <TreatmentCards onOpen={setDetailTreatment} treatments={treatments} />
            ) : null}

            <Table className={isPhone ? 'hidden' : ''} density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('treatments:table.columnTooth')}</TableHead>
                  <TableHead>{t('treatments:table.columnType')}</TableHead>
                  <TableHead>{t('treatments:table.columnDate')}</TableHead>
                  <TableHead>{t('treatments:table.columnStatus')}</TableHead>
                  <TableHead align="right">{t('treatments:table.columnCost')}</TableHead>
                  <TableHead align="right">{t('treatments:table.columnDebt')}</TableHead>
                  <TableHead align="right">{t('treatments:table.columnActions')}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {treatments.map((treatment) => {
                  const debt = Math.max(treatment.remaining ?? 0, 0)

                  return (
                    <TableRow key={treatment.id}>
                      <TableCell>
                        <button
                          className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-callout font-medium text-accent-text"
                          onDoubleClick={() => setDetailTreatment(treatment)}
                          title={t('treatments:table.toothCellHint')}
                          type="button"
                        >
                          {treatment.toothNumber ?? EMPTY}
                        </button>
                      </TableCell>
                      <TableCell>{treatment.treatmentTypeName ?? EMPTY}</TableCell>
                      <TableCell>
                        {treatment.startDate === null
                          ? EMPTY
                          : formatFixedDate(treatment.startDate)}
                      </TableCell>
                      <TableCell>
                        <TreatmentStatusBadge status={treatment.status} />
                      </TableCell>
                      <TableCell align="right" isNumeric>
                        {treatment.totalTreatmentCost === null
                          ? EMPTY
                          : formatSom(
                              treatment.totalTreatmentCost,
                              i18n.language,
                              t('common:currency.som'),
                            )}
                      </TableCell>
                      <TableCell align="right" isNumeric>
                        <span className={debt > 0 ? 'font-semibold text-danger' : undefined}>
                          {formatSom(debt, i18n.language, t('common:currency.som'))}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <DropdownMenu
                          trigger={
                            <Button
                              aria-label={t('treatments:table.actionsMenuLabel', {
                                type: treatment.treatmentTypeName ?? EMPTY,
                                date:
                                  treatment.startDate === null
                                    ? EMPTY
                                    : formatFixedDate(treatment.startDate),
                              })}
                              size="sm"
                              variant="ghost"
                            >
                              <MoreVertical aria-hidden="true" className="size-4" />
                            </Button>
                          }
                        >
                          <DropdownMenuItem onSelect={() => setDetailTreatment(treatment)}>
                            {t('treatments:table.actionDetail')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onEdit(treatment)}>
                            {t('treatments:table.actionEdit')}
                          </DropdownMenuItem>
                          {debt === 0 ? null : (
                            <DropdownMenuItem onSelect={() => onTakePayment(treatment)}>
                              {t('treatments:detail.takePayment')}
                            </DropdownMenuItem>
                          )}
                          {treatment.status === 'completed' ? null : (
                            <DropdownMenuItem onSelect={() => onComplete(treatment)}>
                              {t('treatments:table.actionComplete')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem isDestructive onSelect={() => onDelete(treatment)}>
                            {t('common:action.delete')}
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </>
        )}
      </QueryBoundary>

      {detailTreatment === null ? null : (
        <TreatmentDetailDialog
          onComplete={() => {
            onComplete(detailTreatment)
            setDetailTreatment(null)
          }}
          onDelete={() => {
            onDelete(detailTreatment)
            setDetailTreatment(null)
          }}
          onEdit={() => {
            onEdit(detailTreatment)
            setDetailTreatment(null)
          }}
          onOpenChange={(open) => {
            if (!open) setDetailTreatment(null)
          }}
          onTakePayment={() => {
            onTakePayment(detailTreatment)
            setDetailTreatment(null)
          }}
          open
          treatment={detailTreatment}
        />
      )}
    </div>
  )
}

/**
 * Phone layout of the table. A tap opens the detail dialog, which already
 * carries edit/complete/delete — a per-card menu would duplicate it.
 */
function TreatmentCards({
  treatments,
  onOpen,
}: {
  treatments: Treatment[]
  onOpen: (treatment: Treatment) => void
}) {
  const { t, i18n } = useTranslation(['treatments', 'common'])
  const currency = t('common:currency.som')

  return (
    <ul className="flex flex-col gap-2">
      {treatments.map((treatment) => {
        const debt = Math.max(treatment.remaining ?? 0, 0)
        return (
          <li key={treatment.id}>
            <button
              className="flex w-full flex-col gap-3 rounded-card border border-border bg-surface p-4 text-left transition-colors duration-150 ease-out-apple active:bg-sunken"
              onClick={() => onOpen(treatment)}
              type="button"
            >
              <div className="flex w-full items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-accent-soft text-callout font-semibold text-accent-text">
                  {treatment.toothNumber ?? EMPTY}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-body font-medium text-text">
                    {treatment.treatmentTypeName ?? EMPTY}
                  </span>
                  <span className="text-caption text-text-secondary">
                    {treatment.startDate === null ? EMPTY : formatFixedDate(treatment.startDate)}
                  </span>
                </div>
                <TreatmentStatusBadge status={treatment.status} />
              </div>
              <div className="flex w-full items-center justify-between border-t border-border pt-3 text-callout tabular-nums">
                <span className="text-text-secondary">
                  {treatment.totalTreatmentCost === null
                    ? EMPTY
                    : formatSom(treatment.totalTreatmentCost, i18n.language, currency)}
                </span>
                <span className={debt > 0 ? 'font-semibold text-danger' : 'text-text-tertiary'}>
                  {t('treatments:table.columnDebt')}: {formatSom(debt, i18n.language, currency)}
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
