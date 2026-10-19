import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  type CalendarMonth,
  currentMonth,
  monthLabel,
  shiftMonth,
} from '@/shared/lib/calendarMonth'
import { Button } from './Button'

export interface MonthSwitcherProps {
  month: CalendarMonth
  onMonthChange: (month: CalendarMonth) => void
  locale: string
  previousLabel: string
  nextLabel: string
  /** Shown only away from the clinic's current month. */
  currentLabel: string
}

/** Previous / next month with the month's name between them. */
export function MonthSwitcher({
  month,
  onMonthChange,
  locale,
  previousLabel,
  nextLabel,
  currentLabel,
}: MonthSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        aria-label={previousLabel}
        onClick={() => onMonthChange(shiftMonth(month, -1))}
        size="sm"
        variant="secondary"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Button>
      <h2
        aria-live="polite"
        className="min-w-40 text-center text-headline text-text first-letter:uppercase"
      >
        {monthLabel(month, locale)}
      </h2>
      <Button
        aria-label={nextLabel}
        onClick={() => onMonthChange(shiftMonth(month, 1))}
        size="sm"
        variant="secondary"
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Button>
      {month === currentMonth() ? null : (
        <Button onClick={() => onMonthChange(currentMonth())} size="sm" variant="ghost">
          {currentLabel}
        </Button>
      )}
    </div>
  )
}
