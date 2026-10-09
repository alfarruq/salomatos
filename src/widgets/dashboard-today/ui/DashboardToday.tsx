import { useQuery } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { appointmentQueries } from '@/entities/appointment'
import { doctorQueries } from '@/entities/doctor'
import { Can } from '@/entities/session'
import { clinicNow } from '@/shared/lib/datetime'
import { Button, Card, EmptyState, ErrorState, QueryBoundary, Select, Skeleton } from '@/shared/ui'
import { countToday, findNextAppointment, todaysQueue } from '../model/today'
import { QuickActions } from './QuickActions'
import { TodayCounters } from './TodayCounters'
import { TodayQueue } from './TodayQueue'

/** Radix Select treats `""` as "nothing chosen", so "all doctors" needs a real value. */
const FILTER_ALL = 'all'

export interface DashboardTodayProps {
  clinicId: number
  /** Whose appointments to show; null for everyone's. */
  doctorId: number | null
  /**
   * Present only for those who may look across doctors. A doctor gets no
   * filter at all: their queue is their own, fixed by the page.
   */
  doctorFilter?: { onChange: (doctorId: number | null) => void }
}

/**
 * "What do I need to do right now?" — today's queue, the desk's quick
 * actions and three counts, all from one request.
 */
export function DashboardToday({ clinicId, doctorId, doctorFilter }: DashboardTodayProps) {
  const { t } = useTranslation(['dashboard', 'common'])
  const [isAppointmentOpen, setAppointmentOpen] = useState(false)
  const now = clinicNow()

  const query = useQuery({
    ...appointmentQueries.list(clinicId, { view: 'day', date: now.date }),
    select: (appointments) => todaysQueue(appointments, { date: now.date, doctorId }),
  })

  const addButton = (
    <Can permission="appointment:write">
      <Button
        iconLeft={<CalendarDays aria-hidden="true" className="size-4" />}
        onClick={() => setAppointmentOpen(true)}
        size="sm"
        variant="primary"
      >
        {t('dashboard:queue.addAppointment')}
      </Button>
    </Can>
  )

  return (
    <div className="flex flex-col gap-6">
      <QuickActions
        clinicId={clinicId}
        isAppointmentOpen={isAppointmentOpen}
        onAppointmentOpenChange={setAppointmentOpen}
        today={now.date}
      />

      {/* Counts read the same query — one request feeds both blocks. */}
      <QueryBoundary
        error={() => null}
        loading={
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        }
        query={query}
      >
        {(queue) => <TodayCounters counts={countToday(queue)} />}
      </QueryBoundary>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-title2 text-text">{t('dashboard:queue.title')}</h2>
          {doctorFilter === undefined ? null : (
            <DoctorFilter clinicId={clinicId} onChange={doctorFilter.onChange} value={doctorId} />
          )}
        </div>

        <QueryBoundary
          empty={
            <EmptyState
              action={addButton}
              description={t('dashboard:queue.emptyDescription')}
              headingLevel={3}
              icon={<CalendarDays aria-hidden="true" className="size-8" />}
              title={t('dashboard:queue.empty')}
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
            <div className="flex flex-col gap-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          }
          query={query}
        >
          {(queue) => (
            <TodayQueue nextId={findNextAppointment(queue, now.time)?.id ?? null} queue={queue} />
          )}
        </QueryBoundary>
      </Card>
    </div>
  )
}

function DoctorFilter({
  clinicId,
  value,
  onChange,
}: {
  clinicId: number
  value: number | null
  onChange: (doctorId: number | null) => void
}) {
  const { t } = useTranslation('dashboard')
  const doctors = useQuery(doctorQueries.list(clinicId))

  const options = [
    { value: FILTER_ALL, label: t('filter.doctorAll') },
    ...(doctors.data ?? []).map((doctor) => ({ value: String(doctor.id), label: doctor.fullName })),
  ]

  return (
    <Select
      aria-label={t('filter.doctorLabel')}
      className="w-auto min-w-48"
      onValueChange={(next) => onChange(next === FILTER_ALL ? null : Number(next))}
      options={options}
      size="sm"
      value={value === null ? FILTER_ALL : String(value)}
    />
  )
}
