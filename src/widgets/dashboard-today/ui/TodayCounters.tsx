import { useTranslation } from 'react-i18next'
import { Card } from '@/shared/ui'
import type { TodayCounts } from '../model/today'

/** Three figures, read from the queue already on screen — never a request of their own. */
export function TodayCounters({ counts }: { counts: TodayCounts }) {
  const { t } = useTranslation('dashboard')

  const items = [
    { key: 'total', label: t('counters.total'), value: counts.total },
    { key: 'completed', label: t('counters.completed'), value: counts.completed },
    { key: 'remaining', label: t('counters.remaining'), value: counts.remaining },
  ]

  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <Card className="flex flex-col gap-1 p-3" key={item.key}>
          <dt className="text-caption text-text-secondary">{item.label}</dt>
          <dd className="text-title2 text-text tabular-nums">{item.value}</dd>
        </Card>
      ))}
    </dl>
  )
}
