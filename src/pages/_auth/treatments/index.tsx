import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import * as v from 'valibot'
import { TreatmentTable } from '@/widgets/treatment-table'

/** The page number only — no filters exist server-side yet (see `TreatmentTable`). */
const treatmentsSearchSchema = v.object({
  page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
})

type TreatmentsSearch = v.InferOutput<typeof treatmentsSearchSchema>

export const Route = createFileRoute('/_auth/treatments/')({
  // A hand-edited URL falls back to the first page rather than an error.
  validateSearch: (search): TreatmentsSearch => {
    const result = v.safeParse(treatmentsSearchSchema, search)
    return result.success ? result.output : {}
  },
  component: TreatmentsPage,
})

function TreatmentsPage() {
  const { t } = useTranslation('treatments')
  const { clinicId } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title1 text-text">{t('list.title')}</h1>

      <TreatmentTable
        clinicId={clinicId}
        onPageChange={(page) =>
          void navigate({
            // Page 1 stays out of the URL, so `/treatments` is the canonical first page.
            search: (): TreatmentsSearch => (page === 1 ? {} : { page }),
            to: '/treatments',
          })
        }
        page={search.page ?? 1}
      />
    </div>
  )
}
