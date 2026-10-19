import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import * as v from 'valibot'
import { REPORT_PERIODS } from '@/shared/lib/report'
import { FinanceOverview } from '@/widgets/finance-overview'

/** Shareable view state (§3): a period preset only — nothing here can identify anyone. */
const financeSearchSchema = v.object({
  period: v.optional(v.picklist(REPORT_PERIODS)),
})

type FinanceSearch = v.InferOutput<typeof financeSearchSchema>

export const Route = createFileRoute('/_auth/finance/')({
  // A hand-edited URL falls back to the default period rather than an error.
  validateSearch: (search): FinanceSearch => {
    const result = v.safeParse(financeSearchSchema, search)
    return result.success ? result.output : {}
  },
  component: FinancePage,
})

function FinancePage() {
  const { t } = useTranslation('finance')
  const { clinicId } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title1 text-text">{t('title')}</h1>

      <FinanceOverview
        clinicId={clinicId}
        onPeriodChange={(period) =>
          void navigate({
            // The default stays out of the URL, so `/finance` is the canonical view.
            search: (): FinanceSearch => (period === 'month' ? {} : { period }),
            to: '/finance',
          })
        }
        period={search.period ?? 'month'}
      />
    </div>
  )
}
