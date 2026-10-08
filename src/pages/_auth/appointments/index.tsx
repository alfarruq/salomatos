import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import * as v from 'valibot'
import type { AppointmentFilters } from '@/entities/appointment'
import { todayCalendarDate } from '@/shared/lib/calendarDate'
import { AppointmentCalendar } from '@/widgets/appointment-calendar'

/**
 * The whole view state is shareable (§3) — unlike a patient search term, a
 * day/week and a date are not PHI, and a colleague being able to send "next
 * Tuesday's day view" is the point of putting it in the URL at all.
 */
const appointmentsSearchSchema = v.object({
  view: v.optional(v.picklist(['day', 'week', 'all'])),
  date: v.optional(v.string()),
})

type AppointmentsSearch = v.InferOutput<typeof appointmentsSearchSchema>

export const Route = createFileRoute('/_auth/appointments/')({
  // A hand-edited or stale URL falls back to today's day view rather than
  // taking the screen down with it.
  validateSearch: (search): AppointmentsSearch => {
    const result = v.safeParse(appointmentsSearchSchema, search)
    return result.success ? result.output : {}
  },

  component: AppointmentsPage,
})

function AppointmentsPage() {
  const { t } = useTranslation('appointments')
  const navigate = useNavigate()
  const search = Route.useSearch()
  // Set by the `_auth` guard, which resolved the session before this rendered.
  const { clinicId } = Route.useRouteContext()

  const filters: AppointmentFilters = {
    view: search.view ?? 'day',
    date: search.date ?? todayCalendarDate(),
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title1 text-text">{t('title')}</h1>

      <AppointmentCalendar
        clinicId={clinicId}
        filters={filters}
        onFiltersChange={(next) => {
          // Undefined rather than the default value, so a default never
          // reaches the URL: `/appointments` stays `/appointments` instead of
          // becoming `/appointments?view=day&date=2026-09-27`.
          void navigate({
            search: (): AppointmentsSearch => ({
              ...(next.view === 'day' ? {} : { view: next.view }),
              ...(next.date === todayCalendarDate() ? {} : { date: next.date }),
            }),
            to: '/appointments',
          })
        }}
      />
    </div>
  )
}
