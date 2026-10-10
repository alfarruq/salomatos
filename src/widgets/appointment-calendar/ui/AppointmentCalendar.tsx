import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type Appointment,
  type AppointmentFilters,
  AppointmentStatusBadge,
  appointmentQueries,
} from '@/entities/appointment'
import { CreateAppointmentDialog } from '@/features/appointment-create'
import { DeleteAppointmentDialog } from '@/features/appointment-delete'
import { EditAppointmentDialog } from '@/features/appointment-edit'
import { formatCalendarDate, parseCalendarDate, todayCalendarDate } from '@/shared/lib/calendarDate'
import { useDebounce } from '@/shared/lib/useDebounce'
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  QueryBoundary,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/shared/ui'
import { shiftCalendarDate } from '../model/dateNav'
import { AppointmentWeekBoard, AppointmentWeekBoardSkeleton } from './AppointmentWeekBoard'

const SEARCH_DEBOUNCE_MS = 300

export interface AppointmentCalendarProps {
  clinicId: number
  /** The shareable half of the view state, owned by the route's search params. */
  filters: AppointmentFilters
  onFiltersChange: (next: AppointmentFilters) => void
}

/** Shown when the server had nothing to send for a cell. */
const EMPTY = '—'

/**
 * The clinic's schedule — day, week or all appointments — with the actions
 * that manage it.
 *
 * A widget rather than a page section (§3.1): create, edit and delete each
 * live in their own feature, and this is where they compose.
 */
export function AppointmentCalendar({
  clinicId,
  filters,
  onFiltersChange,
}: AppointmentCalendarProps) {
  const { t, i18n } = useTranslation(['appointments', 'common'])
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [deleting, setDeleting] = useState<Appointment | null>(null)

  // PHI (§3): a name/phone search term never reaches the URL, unlike `filters`.
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS).trim().toLowerCase()

  const query = useQuery(appointmentQueries.list(clinicId, filters))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <fieldset
            aria-label={t('appointments:view.label')}
            className="m-0 flex gap-1 border-0 p-0"
          >
            {(['day', 'week', 'all'] as const).map((view) => (
              <Button
                key={view}
                // A week/all-time view has no navigable "current date" (§
                // widget doc) — switching always lands on today rather than
                // keeping whatever day was mid-navigation in day view.
                onClick={() => onFiltersChange({ view, date: todayCalendarDate() })}
                size="sm"
                variant={filters.view === view ? 'primary' : 'secondary'}
              >
                {t(`appointments:view.${view}`)}
              </Button>
            ))}
          </fieldset>

          {filters.view === 'day' ? (
            <div className="flex items-center gap-1">
              <Button
                aria-label={t('appointments:view.previousDay')}
                onClick={() =>
                  onFiltersChange({ ...filters, date: shiftCalendarDate(filters.date, -1) })
                }
                size="sm"
                variant="ghost"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </Button>
              <Input
                aria-label={t('appointments:form.date')}
                className="w-40"
                onChange={(event) => {
                  const value = event.target.value
                  if (parseCalendarDate(value) !== null)
                    onFiltersChange({ ...filters, date: value })
                }}
                size="sm"
                type="date"
                value={filters.date}
              />
              <Button
                aria-label={t('appointments:view.nextDay')}
                onClick={() =>
                  onFiltersChange({ ...filters, date: shiftCalendarDate(filters.date, 1) })
                }
                size="sm"
                variant="ghost"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          ) : filters.view === 'week' ? (
            <span className="text-callout text-text-secondary">
              {t('appointments:view.currentWeek')}
            </span>
          ) : null}
        </div>

        <Button onClick={() => setCreateOpen(true)} size="sm" variant="primary">
          {t('appointments:create.submit')}
        </Button>
      </div>

      <Input
        className="max-w-sm"
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder={t('appointments:search.placeholder')}
        size="sm"
        type="search"
        value={searchTerm}
      />

      <QueryBoundary
        empty={
          <EmptyState
            action={
              <Button onClick={() => setCreateOpen(true)} variant="primary">
                {t('appointments:create.submit')}
              </Button>
            }
            description={t('appointments:empty.description')}
            title={t('appointments:empty.title')}
          />
        }
        error={({ retry }) => (
          <ErrorState
            description={t('common:error.pageBody')}
            retryLabel={t('common:action.retry')}
            title={t('common:error.pageTitle')}
            {...(retry === undefined ? {} : { onRetry: retry })}
          />
        )}
        loading={
          filters.view === 'week' ? (
            <AppointmentWeekBoardSkeleton />
          ) : (
            <Table density="compact">
              <TableSkeleton columns={filters.view === 'day' ? 5 : 6} rows={6} />
            </Table>
          )
        }
        query={query}
      >
        {(allAppointments) => {
          const matched =
            debouncedSearch === ''
              ? allAppointments
              : allAppointments.filter(
                  (appointment) =>
                    appointment.fullName.toLowerCase().includes(debouncedSearch) ||
                    (appointment.phoneNumber?.toLowerCase().includes(debouncedSearch) ?? false),
                )

          if (matched.length === 0) {
            return <p className="text-body text-text-secondary">{t('appointments:search.empty')}</p>
          }

          if (filters.view === 'week') {
            return (
              <AppointmentWeekBoard
                appointments={matched}
                onDelete={setDeleting}
                onEdit={setEditing}
                referenceDate={filters.date}
              />
            )
          }

          // Defensive: nothing about the endpoint's ordering is confirmed yet
          // (see `entities/appointment/api/queries.ts`), and a schedule shown
          // out of order is worse than a table shown out of order elsewhere.
          const sorted = [...matched].sort((a, b) =>
            a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
          )

          return (
            <Table density="compact">
              <TableHeader>
                <TableRow>
                  {filters.view === 'day' ? null : (
                    <TableHead>{t('appointments:column.date')}</TableHead>
                  )}
                  <TableHead>{t('appointments:column.time')}</TableHead>
                  <TableHead>{t('appointments:column.patient')}</TableHead>
                  <TableHead>{t('appointments:column.doctor')}</TableHead>
                  <TableHead>{t('appointments:column.status')}</TableHead>
                  <TableHead align="right">{t('common:action.edit')}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sorted.map((appointment) => (
                  <TableRow key={appointment.id}>
                    {filters.view === 'day' ? null : (
                      <TableCell>
                        {formatCalendarDate(appointment.date, i18n.language) ?? EMPTY}
                      </TableCell>
                    )}
                    <TableCell>{appointment.time}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-text">{appointment.fullName}</span>
                        {appointment.phoneNumber === null ? null : (
                          <span className="text-caption text-text-secondary">
                            {appointment.phoneNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{appointment.doctorName ?? EMPTY}</TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={appointment.status} />
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex justify-end gap-1">
                        <Button
                          aria-label={`${t('common:action.edit')} — ${appointment.fullName}`}
                          onClick={() => setEditing(appointment)}
                          size="sm"
                          variant="ghost"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          aria-label={`${t('common:action.delete')} — ${appointment.fullName}`}
                          onClick={() => setDeleting(appointment)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        }}
      </QueryBoundary>

      <CreateAppointmentDialog
        clinicId={clinicId}
        defaultDate={filters.date}
        onOpenChange={setCreateOpen}
        open={isCreateOpen}
      />

      {editing === null ? null : (
        <EditAppointmentDialog
          appointment={editing}
          clinicId={clinicId}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          open
        />
      )}

      {deleting === null ? null : (
        <DeleteAppointmentDialog
          appointment={deleting}
          clinicId={clinicId}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
          open
        />
      )}
    </div>
  )
}
