import { CircleCheck, MoreVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Appointment } from '@/entities/appointment'
import { doctorColorOf } from '@/entities/doctor'
import { type CalendarDate, todayCalendarDate } from '@/shared/lib/calendarDate'
import { cn } from '@/shared/lib/cn'
import { DropdownMenu, DropdownMenuItem, Skeleton } from '@/shared/ui'
import { weekDatesOf } from '../model/dateNav'

export interface AppointmentWeekBoardProps {
  appointments: Appointment[]
  /** The week shown is Monday–Sunday of the week containing this date. */
  referenceDate: CalendarDate
  onOpen: (appointment: Appointment) => void
  onEdit: (appointment: Appointment) => void
  onDelete: (appointment: Appointment) => void
}

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

/** Shown when a card has nothing to say beyond the name. */
const EMPTY = '—'

/**
 * Monday–Sunday as seven day columns, each a stack of cards rather than table
 * rows — matches the reference layout the person asked to copy. Client-side
 * grouping by `appointment.date`: whatever the week endpoint sends, only rows
 * that actually land in this Monday–Sunday range get a column to sit in.
 *
 * Below `md` the columns become stacked rows: seven columns on a phone leave
 * each card about forty pixels wide.
 */
export function AppointmentWeekBoard({
  appointments,
  referenceDate,
  onOpen,
  onEdit,
  onDelete,
}: AppointmentWeekBoardProps) {
  const { t } = useTranslation(['appointments', 'common'])
  const dates = weekDatesOf(referenceDate)
  const today = todayCalendarDate()

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-7 md:gap-3">
      {dates.map((date, index) => {
        const dayNumber = Number(date.slice(-2))
        const dayAppointments = appointments
          .filter((appointment) => appointment.date === date)
          .sort((a, b) => a.time.localeCompare(b.time))

        return (
          <div className="flex flex-col gap-2" key={date}>
            <div className="flex items-center gap-2 pb-1 md:flex-col md:gap-1">
              <span className="text-caption text-text-secondary">
                {t(`appointments:weekday.${WEEKDAY_KEYS[index]}`)}
              </span>
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-callout font-semibold',
                  date === today ? 'bg-accent text-on-accent' : 'text-text',
                )}
              >
                {dayNumber}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {dayAppointments.map((appointment) => {
                const color = doctorColorOf(appointment.doctorId)
                const isCompleted = appointment.status === 'completed'
                return (
                  <div
                    className={cn(
                      // The stripe says who; the fill only says whether it is done.
                      'flex flex-col gap-1 rounded-card border border-l-4 border-border p-3',
                      color.stripe,
                      isCompleted ? 'bg-sunken' : 'bg-surface',
                    )}
                    key={appointment.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-callout font-semibold text-accent-text">
                        {appointment.time}
                        {isCompleted ? (
                          <CircleCheck
                            aria-label={t('appointments:status.completed')}
                            className="size-4 text-text-secondary"
                            role="img"
                          />
                        ) : null}
                      </span>
                      <DropdownMenu
                        trigger={
                          <button
                            aria-label={`${t('common:action.edit')} — ${appointment.fullName}`}
                            className="rounded-control p-1 text-text-secondary hover:bg-sunken hover:text-text"
                            type="button"
                          >
                            <MoreVertical aria-hidden="true" className="size-4" />
                          </button>
                        }
                      >
                        <DropdownMenuItem onSelect={() => onEdit(appointment)}>
                          {t('common:action.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem isDestructive onSelect={() => onDelete(appointment)}>
                          {t('common:action.delete')}
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </div>
                    <button
                      className="flex min-w-0 flex-col gap-1 rounded-control text-left hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                      onClick={() => onOpen(appointment)}
                      type="button"
                    >
                      <span className="truncate text-body font-medium text-text">
                        {appointment.fullName}
                      </span>
                      <span className="flex min-w-0 items-center gap-1 text-caption text-text-secondary">
                        {appointment.doctorName === null ? null : (
                          <span
                            aria-hidden="true"
                            className={cn('size-2 shrink-0 rounded-full', color.dot)}
                          />
                        )}
                        <span className="truncate">
                          {[appointment.doctorName, appointment.treatmentTypeName]
                            .filter((value): value is string => value !== null)
                            .join(' · ') || EMPTY}
                        </span>
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Matches `AppointmentWeekBoard`'s column layout, not a generic table skeleton. */
export function AppointmentWeekBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-7 md:gap-3">
      {Array.from({ length: 7 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity and never reorder
        <div className="flex flex-col gap-2" key={`weekday-skeleton-${index}`}>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  )
}
