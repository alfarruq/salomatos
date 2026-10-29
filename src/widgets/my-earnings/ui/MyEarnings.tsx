import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CompensationTerms, expenseQueries, type MyMonth } from '@/entities/expense'
import type { CalendarMonth } from '@/shared/lib/calendarMonth'
import { formatSom } from '@/shared/lib/money'
import { Card, ChartCard, ErrorState, MonthSwitcher, QueryBoundary, Skeleton } from '@/shared/ui'

export interface MyEarningsProps {
  clinicId: number
  month: CalendarMonth
  onMonthChange: (month: CalendarMonth) => void
}

/**
 * The signed-in doctor's own month: what they earned under their terms, what
 * the clinic has paid them, and what is still owed. The same figures the
 * owner sees in that doctor's payroll row; the server computes every one.
 */
export function MyEarnings({ clinicId, month, onMonthChange }: MyEarningsProps) {
  const { t, i18n } = useTranslation(['expenses', 'common'])
  const query = useQuery(expenseQueries.myMonth(clinicId, month))

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher
        currentLabel={t('expenses:recurring.month.current')}
        locale={i18n.language}
        month={month}
        nextLabel={t('expenses:recurring.month.next')}
        onMonthChange={onMonthChange}
        previousLabel={t('expenses:recurring.month.previous')}
      />

      <QueryBoundary
        error={({ retry }) => (
          <ErrorState
            description={t('expenses:error.description')}
            retryLabel={t('common:action.retry')}
            title={t('expenses:mine.error')}
            {...(retry === undefined ? {} : { onRetry: retry })}
          />
        )}
        loading={
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <Skeleton className="h-24 rounded-card" key={key} />
            ))}
          </div>
        }
        query={query}
      >
        {(data) => <EarningsContent data={data} />}
      </QueryBoundary>
    </div>
  )
}

function EarningsContent({ data }: { data: MyMonth }) {
  const { t, i18n } = useTranslation(['expenses', 'common'])
  const money = (amount: number) => formatSom(amount, i18n.language, t('common:currency.som'))

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-3">
        {(['accrued', 'paid', 'balance'] as const).map((key) => (
          <Card className="flex flex-col gap-1 p-4" key={key}>
            <dt className="text-caption text-text-secondary">
              {t(`expenses:payroll.totals.${key}`)}
            </dt>
            <dd className="text-title2 text-text tabular-nums">{money(data[key])}</dd>
          </Card>
        ))}
      </dl>

      <ChartCard title={t('expenses:mine.details')}>
        <dl className="flex flex-col gap-2 text-callout">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-text-secondary">{t('expenses:payroll.terms.title')}</dt>
            <dd className="text-text">
              <CompensationTerms compensation={data.compensation} />
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-text-secondary">{t('expenses:payroll.table.base')}</dt>
            <dd className="text-text tabular-nums">{money(data.baseAmount)}</dd>
          </div>
        </dl>
        {data.opening === 0 ? null : (
          <p className="mt-2 text-callout text-text-secondary">
            {t('expenses:payroll.table.opening', { amount: money(data.opening) })}
          </p>
        )}
      </ChartCard>
    </div>
  )
}
