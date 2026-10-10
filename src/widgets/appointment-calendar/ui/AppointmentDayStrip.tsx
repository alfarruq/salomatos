import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type CalendarDate, parseCalendarDate, todayCalendarDate } from '@/shared/lib/calendarDate'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui'
import { shiftCalendarDate, weekDatesOf } from '../model/dateNav'

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export interface AppointmentDayStripProps {
  selected: CalendarDate
  onSelect: (date: CalendarDate) => void
}

/**
 * Phone replacement for the day view's prev/date/next controls: a whole week
 * is visible at once, so jumping to Thursday is one tap instead of three.
 */
export function AppointmentDayStrip({ selected, onSelect }: AppointmentDayStripProps) {
  const { t } = useTranslation('appointments')
  const today = todayCalendarDate()
  const days = weekDatesOf(selected)

  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label={t('view.previousWeek')}
        className="shrink-0 px-2"
        onClick={() => onSelect(shiftCalendarDate(selected, -7))}
        size="sm"
        variant="ghost"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Button>

      <div className="grid min-w-0 flex-1 grid-cols-7 gap-1">
        {days.map((date, index) => {
          const isSelected = date === selected
          return (
            <button
              aria-current={isSelected ? 'date' : undefined}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-control',
                'transition-colors duration-150 ease-out-apple',
                isSelected ? 'bg-accent text-on-accent' : 'text-text',
              )}
              key={date}
              onClick={() => onSelect(date)}
              type="button"
            >
              <span
                className={cn('text-caption', isSelected ? 'text-on-accent' : 'text-text-tertiary')}
              >
                {t(`weekday.${WEEKDAY_KEYS[index] ?? 'mon'}`)}
              </span>
              <span
                className={cn(
                  'text-body font-semibold tabular-nums',
                  !isSelected && date === today && 'text-accent-text',
                )}
              >
                {parseCalendarDate(date)?.getDate() ?? ''}
              </span>
            </button>
          )
        })}
      </div>

      <Button
        aria-label={t('view.nextWeek')}
        className="shrink-0 px-2"
        onClick={() => onSelect(shiftCalendarDate(selected, 7))}
        size="sm"
        variant="ghost"
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Button>
    </div>
  )
}
