import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as v from 'valibot'
import { STATS_PERIODS } from '@/entities/stats'
import { currentMonth } from '@/shared/lib/calendarMonth'
import { MyEarnings } from '@/widgets/my-earnings'
import { StatisticsOverview } from '@/widgets/statistics-overview'

/** Shareable view state (§3): a period preset only — nothing here can identify anyone. */
const myReportSearchSchema = v.object({
  period: v.optional(v.picklist(STATS_PERIODS)),
})

type MyReportSearch = v.InferOutput<typeof myReportSearchSchema>

/**
 * A doctor's own month and own work. UX only (§3): the server answers
 * `/finance/me/` and `/statistics/me/` with the caller's figures alone.
 */
export const Route = createFileRoute('/_auth/my-report')({
  validateSearch: (search): MyReportSearch => {
    const result = v.safeParse(myReportSearchSchema, search)
    return result.success ? result.output : {}
  },
  beforeLoad: ({ context }) => {
    if (!context.session.permissions.has('reports:own')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: MyReportPage,
})

function MyReportPage() {
  const { t } = useTranslation(['expenses', 'statistics'])
  const { clinicId } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [month, setMonth] = useState(currentMonth)

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-title1 text-text">{t('expenses:mine.title')}</h1>
        <MyEarnings clinicId={clinicId} month={month} onMonthChange={setMonth} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-title2 text-text">{t('statistics:title')}</h2>
        <StatisticsOverview
          clinicId={clinicId}
          onPeriodChange={(period) =>
            void navigate({
              search: (): MyReportSearch => (period === 'month' ? {} : { period }),
              to: '/my-report',
            })
          }
          period={search.period ?? 'month'}
          scope="mine"
        />
      </section>
    </div>
  )
}
