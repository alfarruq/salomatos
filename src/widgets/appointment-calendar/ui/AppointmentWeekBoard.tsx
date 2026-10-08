import { MoreVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Appointment } from '@/entities/appointment'
import type { CalendarDate } from '@/shared/lib/calendarDate'
import { cn } from '@/shared/lib/cn'
import { DropdownMenu, DropdownMenuItem, Skeleton } from '@/shared/ui'
import { weekDatesOf } from '../model/dateNav'

export interface AppointmentWeekBoardProps {
  appointments: Appointment[]
  /** The week shown is Monday–Sunday of the week containing this date. */
  referenceDate: CalendarDate
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
 */
export function AppointmentWeekBoard({
  appointments,
  referenceDate,
  onEdit,
  onDelete,
}: AppointmentWeekBoardProps) {
  const { t } = useTranslation(['appointments', 'common'])
  const dates = weekDatesOf(referenceDate)

  return (
    <div className="grid grid-cols-7 gap-3">
      {dates.map((date, index) => {
        const dayNumber = Number(date.slice(-2))
        const dayAppointments = appointments
          .filter((appointment) => appointment.date === date)
          .sort((a, b) => a.time.localeCompare(b.time))

        return (
          <div className="flex flex-col gap-2" key={date}>
            <div className="flex flex-col items-center gap-1 pb-1">
              <span className="text-caption text-text-secondary">
                {t(`appointments:weekday.${WEEKDAY_KEYS[index]}`)}
              </span>
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-callout font-semibold',
                  date === referenceDate ? 'bg-accent text-on-accent' : 'text-text',
                )}
              >
                {dayNumber}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {dayAppointments.map((appointment) => (
                <div
                  className={cn(
                    'flex flex-col gap-1 rounded-card border border-border p-3',
                    appointment.status === 'completed' ? 'bg-sunken' : 'bg-success/10',
                  )}
                  key={appointment.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-callout font-semibold text-accent-text">
                      {appointment.time}
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
                  <span className="truncate text-body font-medium text-text">
                    {appointment.fullName}
                  </span>
                  <span className="truncate text-caption text-text-secondary">
                    {[appointment.treatmentTypeName, appointment.doctorName]
                      .filter((value): value is string => value !== null)
                      .join(' · ') || EMPTY}
                  </span>
                </div>
              ))}
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
    <div className="grid grid-cols-7 gap-3">
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
