import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Stethoscope, Users, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultPatientFilters, patientQueries } from '@/entities/patient'
import type { Page } from '@/shared/api/pagination'
import { Card, Skeleton } from '@/shared/ui'

/**
 * ⚠️ The list endpoint does not filter by debt yet. Until it does, an unknown
 * `?has_debt=true` would be ignored and the tile would show every patient as
 * a debtor, so it shows a dash instead. Flip this once the backend ships it.
 */
const DEBT_FILTER_ON_SERVER = false

/**
 * Four counts above the patient list.
 *
 * Every figure is the `count` of a first page the list endpoints already
 * serve, so no stats endpoint is needed: one row of each is enough to learn
 * the total. The unfiltered patient count shares its cache entry with the
 * table's own first page.
 */
export function PatientSummary({ clinicId }: { clinicId: number }) {
  const { t } = useTranslation('patients')

  const total = useQuery(patientQueries.list(clinicId, defaultPatientFilters))
  const inProgress = useQuery(
    patientQueries.list(clinicId, { ...defaultPatientFilters, status: 'in_progress' }),
  )
  const completed = useQuery(
    patientQueries.list(clinicId, { ...defaultPatientFilters, status: 'completed' }),
  )
  const debtors = useQuery({
    ...patientQueries.list(clinicId, { ...defaultPatientFilters, hasDebt: true }),
    enabled: DEBT_FILTER_ON_SERVER,
  })

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryTile icon={<Users className="size-5" />} label={t('summary.total')} query={total} />
      <SummaryTile
        icon={<Stethoscope className="size-5" />}
        label={t('summary.inProgress')}
        query={inProgress}
      />
      <SummaryTile
        icon={<CheckCircle2 className="size-5" />}
        label={t('summary.completed')}
        query={completed}
      />
      <SummaryTile
        icon={<Wallet className="size-5" />}
        isAvailable={DEBT_FILTER_ON_SERVER}
        label={t('summary.debtors')}
        query={debtors}
      />
    </dl>
  )
}

function SummaryTile({
  icon,
  label,
  query,
  isAvailable = true,
}: {
  icon: ReactNode
  label: string
  isAvailable?: boolean
  query: UseQueryResult<Page<unknown>>
}) {
  const { i18n } = useTranslation()

  return (
    <Card className="flex items-center gap-3 p-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-text"
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-caption text-text-secondary">{label}</dt>
        <dd className="text-title2 text-text tabular-nums">
          {!isAvailable ? (
            '—'
          ) : query.isPending ? (
            <Skeleton className="my-1 h-6 w-12" />
          ) : query.isError ? (
            // A tile is a convenience; the table below carries its own error state.
            '—'
          ) : (
            new Intl.NumberFormat(i18n.language).format(query.data.count)
          )}
        </dd>
      </div>
    </Card>
  )
}
