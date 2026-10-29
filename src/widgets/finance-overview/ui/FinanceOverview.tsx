import { useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type FinanceOverview as FinanceOverviewData, financeQueries } from '@/entities/finance'
import { clinicNow } from '@/shared/lib/datetime'
import { formatSom } from '@/shared/lib/money'
import { bucketLabel, REPORT_PERIODS, type ReportPeriod, rangeOf } from '@/shared/lib/report'
import {
  BarChart,
  BarList,
  ChartCard,
  EmptyState,
  ErrorState,
  QueryBoundary,
  Select,
  Skeleton,
} from '@/shared/ui'
import { DebtorsTable } from './DebtorsTable'
import { FinanceKpis } from './FinanceKpis'
import { ProfitKpis } from './ProfitKpis'

export interface FinanceOverviewProps {
  clinicId: number
  period: ReportPeriod
  onPeriodChange: (period: ReportPeriod) => void
}

/** How many services the ranking shows before the tail stops being informative. */
const TOP_SERVICES = 6

export function FinanceOverview({ clinicId, period, onPeriodChange }: FinanceOverviewProps) {
  const { t } = useTranslation('finance')
  // The clinic's day, not the browser's (§14): "last 7 days" ends there.
  const range = rangeOf(period, clinicNow().date)
  const query = useQuery(financeQueries.overview(clinicId, range))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          aria-label={t('period.label')}
          className="w-auto shrink-0"
          onValueChange={(value) => onPeriodChange(value as ReportPeriod)}
          options={REPORT_PERIODS.map((value) => ({
            value,
            label: t(`period.${value}`),
          }))}
          size="sm"
          value={period}
        />
      </div>

      <QueryBoundary
        empty={
          <EmptyState
            description={t('empty.description')}
            icon={<Wallet aria-hidden="true" className="size-8" />}
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
        isEmpty={(data) =>
          data.totals.billed === 0 && data.totals.collected === 0 && data.topDebtors.length === 0
        }
        loading={<OverviewSkeleton />}
        query={query}
      >
        {(data) => <OverviewContent clinicId={clinicId} data={data} />}
      </QueryBoundary>
    </div>
  )
}

function OverviewContent({ clinicId, data }: { clinicId: number; data: FinanceOverviewData }) {
  const { t, i18n } = useTranslation('finance')
  const money = (amount: number) => formatSom(amount, i18n.language, t('common:currency.som'))

  return (
    <div className="flex flex-col gap-6">
      <FinanceKpis previous={data.previousTotals} totals={data.totals} />
      <ProfitKpis
        clinicId={clinicId}
        previous={data.previousTotals}
        range={data.range}
        totals={data.totals}
      />

      <ChartCard description={t('charts.revenue.description')} title={t('charts.revenue.title')}>
        <BarChart
          data={data.series.map((point) => ({
            key: point.start,
            label: bucketLabel(point.start, data.range.bucket, i18n.language),
            value: point.billed,
            part: point.collected,
          }))}
          formatValue={money}
          label={t('charts.revenue.title')}
          partLabel={t('charts.revenue.collected')}
          valueLabel={t('charts.revenue.billed')}
        />
      </ChartCard>

      <ChartCard description={t('charts.doctors.description')} title={t('charts.doctors.title')}>
        <BarList
          formatValue={money}
          items={[...data.doctors]
            .sort((a, b) => b.collected - a.collected)
            .map((row) => ({
              key: String(row.doctorId),
              label: row.doctorName,
              value: row.collected,
            }))}
          label={t('charts.doctors.title')}
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-2"
          description={t('charts.services.description')}
          title={t('charts.services.title')}
        >
          <BarList
            formatValue={money}
            items={[...data.treatmentTypes]
              .sort((a, b) => b.billed - a.billed)
              .slice(0, TOP_SERVICES)
              .map((row) => ({
                key: String(row.treatmentTypeId),
                label: row.treatmentTypeName,
                value: row.billed,
              }))}
            label={t('charts.services.title')}
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-3"
          description={t('debtors.description')}
          title={t('debtors.title')}
        >
          {data.topDebtors.length === 0 ? (
            <p className="text-callout text-text-secondary">{t('debtors.empty')}</p>
          ) : (
            <DebtorsTable debtors={data.topDebtors} linkToPatients />
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
