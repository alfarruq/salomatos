import { useQuery } from '@tanstack/react-query'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { expenseQueries } from '@/entities/expense'
import type { FinanceTotals } from '@/entities/finance'
import { formatSom } from '@/shared/lib/money'
import { percentChange, percentOf, type ReportRange } from '@/shared/lib/report'
import { Card, Skeleton } from '@/shared/ui'

export interface ProfitKpisProps {
  clinicId: number
  range: ReportRange
  totals: FinanceTotals
  previous: FinanceTotals | null
}

/**
 * Cash basis: money in minus money out in the same window, so profit is what
 * actually stayed with the clinic, not what it billed.
 */
export function ProfitKpis({ clinicId, range, totals, previous }: ProfitKpisProps) {
  const { t, i18n } = useTranslation('finance')
  const query = useQuery(expenseQueries.summary(clinicId, range))
  const money = (amount: number) => formatSom(amount, i18n.language, t('common:currency.som'))

  if (query.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <Card className="p-4">
        <p className="text-caption text-text-secondary">{t('profit.error')}</p>
      </Card>
    )
  }

  const expenses = query.data.totals.total
  const profit = totals.collected - expenses
  const previousExpenses = query.data.previousTotals?.total ?? null
  const previousProfit =
    previous === null || previousExpenses === null ? null : previous.collected - previousExpenses

  const items = [
    {
      key: 'expenses',
      value: expenses,
      change: percentChange(expenses, previousExpenses),
      note: t('profit.expensesNote', { percent: percentOf(expenses, totals.collected) }),
    },
    {
      key: 'profit',
      value: profit,
      // A change against a loss reads backwards, so it is only shown between two profits.
      change:
        previousProfit !== null && previousProfit > 0
          ? percentChange(profit, previousProfit)
          : null,
      note:
        totals.collected > 0
          ? t('profit.margin', { percent: percentOf(profit, totals.collected) })
          : null,
    },
  ] as const

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <Card className="flex flex-col gap-1 p-4" key={item.key}>
          <dt className="text-caption text-text-secondary">{t(`profit.${item.key}`)}</dt>
          <dd className="text-title2 text-text tabular-nums">{money(item.value)}</dd>
          {item.change === null ? null : (
            <dd className="flex flex-wrap items-center gap-x-1 text-caption text-text-secondary">
              <Change change={item.change} />
              <span className="tabular-nums">
                {item.change > 0 ? '+' : ''}
                {item.change}%
              </span>
              <span className="text-text-tertiary">{t('kpi.vsPrevious')}</span>
            </dd>
          )}
          {item.note === null ? null : (
            <dd className="text-caption text-text-secondary">{item.note}</dd>
          )}
        </Card>
      ))}
    </dl>
  )
}

function Change({ change }: { change: number }) {
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  return <Icon aria-hidden="true" className="size-4 shrink-0" />
}
