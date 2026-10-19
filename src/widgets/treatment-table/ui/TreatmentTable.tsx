import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Stethoscope } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCan } from '@/entities/session'
import {
  defaultTreatmentListFilters,
  type Treatment,
  type TreatmentListFilters,
  TreatmentStatusBadge,
  treatmentQueries,
} from '@/entities/treatment'
import { PAGE_SIZE } from '@/shared/api/pagination'
import { formatFixedDate } from '@/shared/lib/calendarDate'
import { cn } from '@/shared/lib/cn'
import { formatSom } from '@/shared/lib/money'
import {
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  QueryBoundary,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/shared/ui'
import { TreatmentFilters } from './TreatmentFilters'

export interface TreatmentTableProps {
  clinicId: number
  /** From the URL — ids and a page number only, never a name (§3). */
  filters: TreatmentListFilters
  onFiltersChange: (filters: TreatmentListFilters) => void
}

/** Shown when the server had nothing to send for a cell. */
const EMPTY = '—'

/**
 * Every treatment in the clinic, filtered on the server — by patient, doctor,
 * treatment type, debt and status — and a page at a time.
 */
export function TreatmentTable({ clinicId, filters, onFiltersChange }: TreatmentTableProps) {
  const { t, i18n } = useTranslation(['treatments', 'common'])
  const query = useQuery(treatmentQueries.page(clinicId, filters))
  const { page } = filters
  const isFiltered =
    filters.patientId !== null ||
    filters.doctorId !== null ||
    filters.treatmentTypeId !== null ||
    filters.debt !== null ||
    filters.status !== null
  // A doctor has no `billing:read` (ADR-012): the money columns are not theirs.
  const canSeeMoney = useCan('billing:read')
  const navigate = useNavigate()

  const money = (value: number | null) =>
    value === null ? EMPTY : formatSom(value, i18n.language, t('common:currency.som'))

  const openPatient = (treatment: Treatment) => {
    if (treatment.patientId === null) return
    void navigate({
      to: '/patients/$patientId',
      params: { patientId: String(treatment.patientId) },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <TreatmentFilters clinicId={clinicId} filters={filters} onFiltersChange={onFiltersChange} />

      <QueryBoundary
        empty={
          isFiltered ? (
            <EmptyState
              action={
                <Button onClick={() => onFiltersChange(defaultTreatmentListFilters)} size="sm">
                  {t('treatments:filters.clear')}
                </Button>
              }
              description={t('treatments:filters.noMatchDescription')}
              headingLevel={2}
              icon={<Stethoscope aria-hidden="true" className="size-8" />}
              title={t('treatments:filters.noMatch')}
            />
          ) : (
            <EmptyState
              description={t('treatments:list.emptyDescription')}
              headingLevel={2}
              icon={<Stethoscope aria-hidden="true" className="size-8" />}
              title={t('treatments:list.empty')}
            />
          )
        }
        error={({ retry }) => (
          <ErrorState
            description={t('common:error.pageBody')}
            retryLabel={t('common:action.retry')}
            title={t('common:error.pageTitle')}
            {...(retry === undefined ? {} : { onRetry: retry })}
          />
        )}
        isEmpty={(data) => data.results.length === 0}
        loading={
          <Table>
            <TableSkeleton columns={canSeeMoney ? 10 : 7} rows={PAGE_SIZE} />
          </Table>
        }
        query={query}
      >
        {(data) => (
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('treatments:table.columnDate')}</TableHead>
                  <TableHead>{t('treatments:list.columnPatient')}</TableHead>
                  <TableHead>{t('treatments:list.columnDoctor')}</TableHead>
                  <TableHead>{t('treatments:table.columnType')}</TableHead>
                  <TableHead align="center">{t('treatments:table.columnTooth')}</TableHead>
                  <TableHead align="center">{t('treatments:list.columnVisit')}</TableHead>
                  {canSeeMoney ? (
                    <>
                      <TableHead align="right">{t('treatments:table.columnCost')}</TableHead>
                      <TableHead align="right">{t('treatments:list.columnPaid')}</TableHead>
                      <TableHead align="right">{t('treatments:table.columnDebt')}</TableHead>
                    </>
                  ) : null}
                  <TableHead>{t('treatments:table.columnStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((treatment) => (
                  <TableRow
                    isInteractive={treatment.patientId !== null}
                    key={treatment.id}
                    onClick={() => openPatient(treatment)}
                  >
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {treatment.startDate === null ? EMPTY : formatFixedDate(treatment.startDate)}
                    </TableCell>
                    <TableCell>
                      {/* The keyboard path to the patient; the row click is the mouse's. */}
                      {treatment.patientId === null ? (
                        (treatment.patientName ?? EMPTY)
                      ) : (
                        <Link
                          className="font-medium text-text hover:underline focus-visible:underline"
                          onClick={(event) => event.stopPropagation()}
                          params={{ patientId: String(treatment.patientId) }}
                          to="/patients/$patientId"
                        >
                          {treatment.patientName ?? EMPTY}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>{treatment.doctorName ?? EMPTY}</TableCell>
                    <TableCell>{treatment.treatmentTypeName ?? EMPTY}</TableCell>
                    <TableCell align="center" className="tabular-nums">
                      {treatment.toothNumber ?? EMPTY}
                    </TableCell>
                    <TableCell align="center" className="tabular-nums">
                      {treatment.visitNumber ?? EMPTY}
                    </TableCell>
                    {canSeeMoney ? (
                      <>
                        <TableCell align="right" className="whitespace-nowrap tabular-nums">
                          {money(treatment.totalTreatmentCost)}
                        </TableCell>
                        <TableCell align="right" className="whitespace-nowrap tabular-nums">
                          {money(treatment.totalPaid)}
                        </TableCell>
                        <TableCell
                          align="right"
                          className={cn(
                            'whitespace-nowrap tabular-nums',
                            // Same as the patient's own treatments tab: only money still owed is red.
                            (treatment.remaining ?? 0) > 0 && 'font-semibold text-danger',
                          )}
                        >
                          {money(treatment.remaining)}
                        </TableCell>
                      </>
                    ) : null}
                    <TableCell>
                      <TreatmentStatusBadge status={treatment.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              hasNext={data.next !== null}
              hasPrevious={data.previous !== null}
              isLoading={query.isFetching}
              nextLabel={t('common:action.next')}
              onNext={() => onFiltersChange({ ...filters, page: page + 1 })}
              onPrevious={() => onFiltersChange({ ...filters, page: page - 1 })}
              previousLabel={t('common:action.previous')}
              summary={t('treatments:list.summary', {
                count: data.count,
                from: (page - 1) * PAGE_SIZE + 1,
                to: Math.min(page * PAGE_SIZE, data.count),
              })}
            />
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
