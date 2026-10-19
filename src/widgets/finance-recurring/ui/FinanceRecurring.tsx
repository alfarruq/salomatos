import { useQuery } from '@tanstack/react-query'
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type CalendarMonth, EXPENSES_SOURCE_IS_MOCK, expenseQueries } from '@/entities/expense'
import { formatSom } from '@/shared/lib/money'
import { Alert, Button, Card, EmptyState, ErrorState, QueryBoundary, Skeleton } from '@/shared/ui'
import { currentMonth, monthLabel, shiftMonth } from '../lib/month'
import { DueList } from './DueList'
import { RecurringTemplates } from './RecurringTemplates'

export interface FinanceRecurringProps {
  clinicId: number
  month: CalendarMonth
  onMonthChange: (month: CalendarMonth) => void
}

/**
 * The month's bills against what was really paid. Templates only remind:
 * every payment is confirmed by hand and posted as an ordinary expense.
 */
export function FinanceRecurring({ clinicId, month, onMonthChange }: FinanceRecurringProps) {
  const { t, i18n } = useTranslation(['expenses', 'common'])
  const dueQuery = useQuery(expenseQueries.due(clinicId, month))
  const label = monthLabel(month, i18n.language)
  const money = (amount: number) => formatSom(amount, i18n.language, t('common:currency.som'))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          aria-label={t('expenses:recurring.month.previous')}
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          size="sm"
          variant="secondary"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        <h2
          aria-live="polite"
          className="min-w-40 text-center text-headline text-text first-letter:uppercase"
        >
          {label}
        </h2>
        <Button
          aria-label={t('expenses:recurring.month.next')}
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          size="sm"
          variant="secondary"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
        {month === currentMonth() ? null : (
          <Button onClick={() => onMonthChange(currentMonth())} size="sm" variant="ghost">
            {t('expenses:recurring.month.current')}
          </Button>
        )}
      </div>

      {EXPENSES_SOURCE_IS_MOCK ? (
        <Alert title={t('expenses:demo.title')}>{t('expenses:recurring.demo')}</Alert>
      ) : null}

      <QueryBoundary
        empty={
          <EmptyState
            description={t('expenses:recurring.empty.description')}
            icon={<CalendarClock aria-hidden="true" className="size-8" />}
            title={t('expenses:recurring.empty.title')}
          />
        }
        error={({ retry }) => (
          <ErrorState
            description={t('expenses:error.description')}
            retryLabel={t('common:action.retry')}
            title={t('expenses:recurring.error')}
            {...(retry === undefined ? {} : { onRetry: retry })}
          />
        )}
        isEmpty={(due) => due.items.length === 0}
        loading={<DueSkeleton />}
        query={dueQuery}
      >
        {(due) => (
          <div className="flex flex-col gap-6">
            <dl className="grid gap-3 sm:grid-cols-3">
              {(['expected', 'paid', 'remaining'] as const).map((key) => (
                <Card className="flex flex-col gap-1 p-4" key={key}>
                  <dt className="text-caption text-text-secondary">
                    {t(`expenses:recurring.totals.${key}`)}
                  </dt>
                  <dd className="text-title2 text-text tabular-nums">{money(due.totals[key])}</dd>
                </Card>
              ))}
            </dl>
            <DueList clinicId={clinicId} due={due} monthLabel={label} />
          </div>
        )}
      </QueryBoundary>

      <RecurringTemplates clinicId={clinicId} />
    </div>
  )
}

function DueSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton className="h-24 rounded-card" key={key} />
        ))}
      </div>
      <Skeleton className="h-96 rounded-card" />
    </div>
  )
}
