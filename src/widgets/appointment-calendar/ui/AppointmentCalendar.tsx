import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { PHONE_QUERY, useMediaQuery } from '@/shared/lib/useMediaQuery'
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
import { AppointmentDayStrip } from './AppointmentDayStrip'
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
  filters: routeFilters,
  onFiltersChange,
}: AppointmentCalendarProps) {
  const { t, i18n } = useTranslation(['appointments', 'common'])
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [deleting, setDeleting] = useState<Appointment | null>(null)

  // PHI (§3): a name/phone search term never reaches the URL, unlike `filters`.
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS).trim().toLowerCase()

  const isPhone = useMediaQuery(PHONE_QUERY)
  // Phone is date-only: a shared week/all link still opens as one day there.
  const filters: AppointmentFilters =
    isPhone && routeFilters.view !== 'day' ? { ...routeFilters, view: 'day' } : routeFilters
  const query = useQuery(appointmentQueries.list(clinicId, filters))

  const selectDate = (value: string) => {
    // An emptied or half-typed date input reports '' — keep the current day.
    if (parseCalendarDate(value) !== null) onFiltersChange({ ...filters, date: value })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {isPhone ? (
            <Input
              aria-label={t('appointments:form.date')}
              className="w-48"
              onChange={(event) => selectDate(event.target.value)}
              type="date"
              value={filters.date}
            />
          ) : (
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
          )}

          {isPhone ? null : filters.view === 'day' ? (
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
                onChange={(event) => selectDate(event.target.value)}
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

        <Button
          iconLeft={<Plus aria-hidden="true" className="size-4" />}
          isFloatingOnPhone
          onClick={() => setCreateOpen(true)}
          size="sm"
          variant="primary"
        >
          {t('appointments:create.submit')}
        </Button>
      </div>

      {isPhone ? (
        <AppointmentDayStrip
          onSelect={(date) => onFiltersChange({ ...filters, date })}
          selected={filters.date}
        />
      ) : null}

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

          if (isPhone) {
            return (
              <AppointmentList
                appointments={sorted}
                onDelete={setDeleting}
                onEdit={setEditing}
                showDate={filters.view !== 'day'}
              />
            )
          }

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

/**
 * Phone layout of the day/all table: time leads each row because that is
 * what staff scan for, and nothing has to scroll sideways.
 */
function AppointmentList({
  appointments,
  showDate,
  onEdit,
  onDelete,
}: {
  appointments: Appointment[]
  showDate: boolean
  onEdit: (appointment: Appointment) => void
  onDelete: (appointment: Appointment) => void
}) {
  const { t, i18n } = useTranslation(['appointments', 'common'])

  return (
    <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
      {appointments.map((appointment) => (
        <li className="flex min-h-16 items-center gap-3 py-2 pr-1 pl-4" key={appointment.id}>
          <div className="flex w-14 shrink-0 flex-col">
            {showDate ? (
              <span className="text-caption text-text-tertiary">
                {formatCalendarDate(appointment.date, i18n.language) ?? EMPTY}
              </span>
            ) : null}
            <span className="text-body font-semibold tabular-nums text-text">
              {appointment.time}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-body font-medium text-text">{appointment.fullName}</span>
            <div className="flex min-w-0 items-center gap-2">
              <AppointmentStatusBadge status={appointment.status} />
              <span className="truncate text-caption text-text-secondary">
                {appointment.doctorName ?? appointment.phoneNumber ?? EMPTY}
              </span>
            </div>
          </div>

          <div className="flex shrink-0">
            <Button
              aria-label={`${t('common:action.edit')} — ${appointment.fullName}`}
              className="size-11 px-0"
              onClick={() => onEdit(appointment)}
              size="sm"
              variant="ghost"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
            <Button
              aria-label={`${t('common:action.delete')} — ${appointment.fullName}`}
              className="size-11 px-0"
              onClick={() => onDelete(appointment)}
              size="sm"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
