import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  rangeOf,
  STATS_PERIODS,
  STATS_SOURCE_IS_MOCK,
  type StatsOverview,
  type StatsPeriod,
  statsQueries,
} from '@/entities/stats'
import { clinicNow } from '@/shared/lib/datetime'
import {
  Alert,
  BarChart,
  BarList,
  Card,
  EmptyState,
  ErrorState,
  QueryBoundary,
  Select,
  Skeleton,
} from '@/shared/ui'
import { bucketLabel } from '../model/format'
import { BusyHoursHeatmap } from './BusyHoursHeatmap'
import { KpiTiles } from './KpiTiles'
import { PatientMix } from './PatientMix'

export interface StatisticsOverviewProps {
  clinicId: number
  period: StatsPeriod
  onPeriodChange: (period: StatsPeriod) => void
}

/** How many services the ranking shows before the tail stops being informative. */
const TOP_SERVICES = 6

export function StatisticsOverview({ clinicId, period, onPeriodChange }: StatisticsOverviewProps) {
  const { t } = useTranslation('statistics')
  // The clinic's day, not the browser's (§14): "last 7 days" ends there.
  const range = rangeOf(period, clinicNow().date)
  const query = useQuery(statsQueries.overview(clinicId, range))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          aria-label={t('period.label')}
          className="w-auto shrink-0"
          onValueChange={(value) => onPeriodChange(value as StatsPeriod)}
          options={STATS_PERIODS.map((value) => ({ value, label: t(`period.${value}`) }))}
          size="sm"
          value={period}
        />
      </div>

      {STATS_SOURCE_IS_MOCK ? <Alert title={t('demo.title')}>{t('demo.description')}</Alert> : null}

      <QueryBoundary
        empty={
          <EmptyState
            description={t('empty.description')}
            icon={<BarChart3 aria-hidden="true" className="size-8" />}
            title={t('empty.title')}
          />
        }
        error={({ retry }) => (
          <ErrorState
            description={t('error.description')}
            retryLabel={t('common:action.retry')}
            title={t('error.title')}
            {...(retry === undefined ? {} : { onRetry: retry })}
          />
        )}
        isEmpty={(data) => data.totals.appointments === 0}
        loading={<OverviewSkeleton />}
        query={query}
      >
        {(data) => <OverviewContent data={data} />}
      </QueryBoundary>
    </div>
  )
}

function OverviewContent({ data }: { data: StatsOverview }) {
  const { t, i18n } = useTranslation('statistics')

  return (
    <div className="flex flex-col gap-6">
      <KpiTiles previous={data.previousTotals} totals={data.totals} />

      <Section title={t('charts.appointments.title')}>
        <BarChart
          data={data.appointmentsSeries.map((point) => ({
            key: point.start,
            label: bucketLabel(point.start, data.range.bucket, i18n.language),
            value: point.total,
            part: point.completed,
          }))}
          label={t('charts.appointments.title')}
          partLabel={t('charts.appointments.completed')}
          valueLabel={t('charts.appointments.booked')}
        />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section description={t('charts.doctors.description')} title={t('charts.doctors.title')}>
          <BarList
            items={[...data.doctors]
              .sort((a, b) => b.appointments - a.appointments)
              .map((row) => ({
                key: String(row.doctorId),
                label: row.doctorName,
                value: row.appointments,
              }))}
            label={t('charts.doctors.title')}
          />
        </Section>

        <Section description={t('charts.services.description')} title={t('charts.services.title')}>
          <BarList
            items={[...data.treatmentTypes]
              .sort((a, b) => b.count - a.count)
              .slice(0, TOP_SERVICES)
              .map((row) => ({
                key: String(row.treatmentTypeId),
                label: row.treatmentTypeName,
                value: row.count,
              }))}
            label={t('charts.services.title')}
          />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section
          className="lg:col-span-2"
          description={t('charts.busy.description')}
          title={t('charts.busy.title')}
        >
          <BusyHoursHeatmap slots={data.busySlots} />
        </Section>

        <Section title={t('charts.patients.title')}>
          <PatientMix totals={data.totals} />
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  className,
  children,
}: {
  title: string
  description?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card {...(className === undefined ? {} : { className })}>
      <section className="flex flex-col gap-4 p-4 sm:p-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-body font-medium text-text">{title}</h2>
          {description === undefined ? null : (
            <p className="text-caption text-text-secondary">{description}</p>
          )}
        </header>
        {children}
      </section>
    </Card>
  )
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton className="h-24 rounded-card" key={key} />
        ))}
      </div>
      <Skeleton className="h-80 rounded-card" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    </div>
  )
}
