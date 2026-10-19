import { useTranslation } from 'react-i18next'
import type { StatsOverview } from '@/entities/stats'
import { bucketLabel } from '@/shared/lib/report'
import { BarChart, BarList, Card, ChartCard } from '@/shared/ui'
import { ToothHeatmap } from './ToothHeatmap'

/** How many services the ranking shows before the tail stops being informative. */
const TOP_SERVICES = 6

/** Everything about treatments: volume, who does them, what and on which teeth. */
export function TreatmentsSection({ data }: { data: StatsOverview }) {
  const { t, i18n } = useTranslation('statistics')
  const number = new Intl.NumberFormat(i18n.language)

  const counters = [
    { key: 'started', label: t('treatments.started'), value: data.totals.treatmentsStarted },
    { key: 'completed', label: t('treatments.completed'), value: data.totals.treatmentsCompleted },
    {
      key: 'inProgress',
      label: t('treatments.inProgress'),
      value: data.totals.treatmentsInProgress,
    },
  ]

  return (
    <section aria-labelledby="stats-treatments" className="flex flex-col gap-6">
      <h2 className="text-title2 text-text" id="stats-treatments">
        {t('treatments.title')}
      </h2>

      <dl className="grid grid-cols-3 gap-3">
        {counters.map((item) => (
          <Card className="flex flex-col gap-1 p-4" key={item.key}>
            <dt className="text-caption text-text-secondary">{item.label}</dt>
            <dd className="text-title2 text-text tabular-nums">{number.format(item.value)}</dd>
          </Card>
        ))}
      </dl>

      <ChartCard title={t('charts.treatments.title')}>
        <BarChart
          data={data.treatmentsSeries.map((point) => ({
            key: point.start,
            label: bucketLabel(point.start, data.range.bucket, i18n.language),
            value: point.completed,
          }))}
          label={t('charts.treatments.title')}
          valueLabel={t('treatments.completed')}
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          description={t('charts.treatmentDoctors.description')}
          title={t('charts.treatmentDoctors.title')}
        >
          <BarList
            items={[...data.doctors]
              .sort((a, b) => b.treatmentsCompleted - a.treatmentsCompleted)
              .map((row) => ({
                key: String(row.doctorId),
                label: row.doctorName,
                value: row.treatmentsCompleted,
              }))}
            label={t('charts.treatmentDoctors.title')}
          />
        </ChartCard>

        <ChartCard
          description={t('charts.services.description')}
          title={t('charts.services.title')}
        >
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
        </ChartCard>
      </div>

      <ChartCard description={t('charts.teeth.description')} title={t('charts.teeth.title')}>
        <ToothHeatmap teeth={data.teeth} />
      </ChartCard>
    </section>
  )
}
