import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import * as v from 'valibot'
import type { TreatmentListFilters } from '@/entities/treatment'
import { TreatmentTable } from '@/widgets/treatment-table'

const positiveId = v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)))

/**
 * Shareable view state (§3): ids, a page and a debt flag — never a name.
 * `?patient=10` identifies a record; `?patient=Aliyev` would disclose one.
 */
const treatmentsSearchSchema = v.object({
  page: positiveId,
  patient: positiveId,
  doctor: positiveId,
  type: positiveId,
  debt: v.optional(v.picklist(['with', 'without'])),
})

type TreatmentsSearch = v.InferOutput<typeof treatmentsSearchSchema>

export const Route = createFileRoute('/_auth/treatments/')({
  // A hand-edited URL falls back to the unfiltered first page rather than an error.
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

  const filters: TreatmentListFilters = {
    page: search.page ?? 1,
    patientId: search.patient ?? null,
    doctorId: search.doctor ?? null,
    treatmentTypeId: search.type ?? null,
    debt: search.debt ?? null,
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title1 text-text">{t('list.title')}</h1>

      <TreatmentTable
        clinicId={clinicId}
        filters={filters}
        onFiltersChange={(next) =>
          void navigate({
            // Defaults stay out of the URL, so `/treatments` is the canonical unfiltered first page.
            search: (): TreatmentsSearch => ({
              ...(next.page === 1 ? {} : { page: next.page }),
              ...(next.patientId === null ? {} : { patient: next.patientId }),
              ...(next.doctorId === null ? {} : { doctor: next.doctorId }),
              ...(next.treatmentTypeId === null ? {} : { type: next.treatmentTypeId }),
              ...(next.debt === null ? {} : { debt: next.debt }),
            }),
            to: '/treatments',
          })
        }
      />
    </div>
  )
}
