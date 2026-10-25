import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, Stethoscope, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { appointmentQueries } from '@/entities/appointment'
import { defaultPatientFilters, patientQueries } from '@/entities/patient'
import type { Page } from '@/shared/api/pagination'
import { clinicNow } from '@/shared/lib/datetime'
import { Card, Skeleton } from '@/shared/ui'

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
  // The clinic's day, not the browser's (§14).
  const today = clinicNow().date

  const total = useQuery(patientQueries.list(clinicId, defaultPatientFilters))
  const inProgress = useQuery(
    patientQueries.list(clinicId, { ...defaultPatientFilters, status: 'in_progress' }),
  )
  const completed = useQuery(
    patientQueries.list(clinicId, { ...defaultPatientFilters, status: 'completed' }),
  )
  const appointmentsToday = useQuery(
    appointmentQueries.page(clinicId, { view: 'day', date: today }, 1),
  )

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryTile icon={<Users className="size-5" />} label={t('summary.total')} query={total} />
      <SummaryTile
        icon={<CalendarDays className="size-5" />}
        label={t('summary.appointmentsToday')}
        query={appointmentsToday}
      />
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
    </dl>
  )
}

function SummaryTile({
  icon,
  label,
  query,
}: {
  icon: ReactNode
  label: string
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
          {query.isPending ? (
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
