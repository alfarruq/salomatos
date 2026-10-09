import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import * as v from 'valibot'
import { useSession } from '@/entities/session'
import { DashboardToday } from '@/widgets/dashboard-today'

/** An id only (§3): a doctor's id is not PHI, a name would be needless. */
const dashboardSearchSchema = v.object({
  doctor: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
})

type DashboardSearch = v.InferOutput<typeof dashboardSearchSchema>

export const Route = createFileRoute('/_auth/dashboard')({
  // A hand-edited URL falls back to "all doctors" rather than an error page.
  validateSearch: (search): DashboardSearch => {
    const result = v.safeParse(dashboardSearchSchema, search)
    return result.success ? result.output : {}
  },
  component: DashboardPage,
})

/**
 * "Today" — the staff's starting screen, not a report.
 *
 * A doctor sees only their own queue. That match is reliable here, not
 * guessed: a doctor is a `User` row, the session's `userId` is that row's id
 * (the token's `user_id`), and an appointment's `doctor_id` was confirmed live
 * to hold exactly the ids `/clinic/doctors/` lists. ⚠️ It is UX, not access
 * control — whether the server itself narrows a doctor's list is unknown.
 */
function DashboardPage() {
  const { t } = useTranslation('common')
  const { clinicId } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const session = useSession()

  if (session === undefined) return null

  const isDoctor = session.role === 'doctor'

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title1 text-text">{t('nav.dashboard')}</h1>

      {isDoctor ? (
        <DashboardToday clinicId={clinicId} doctorId={session.userId} />
      ) : (
        <DashboardToday
          clinicId={clinicId}
          doctorFilter={{
            onChange: (doctor) =>
              void navigate({
                search: (): DashboardSearch => (doctor === null ? {} : { doctor }),
                to: '/dashboard',
              }),
          }}
          doctorId={search.doctor ?? null}
        />
      )}
    </div>
  )
}
