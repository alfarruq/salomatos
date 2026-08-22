import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Button } from './Button'

export interface PaginationProps {
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  /** Disables both directions while a page is in flight. */
  isLoading?: boolean
  previousLabel: string
  nextLabel: string
  /** Optional "1–25" style position line. Callers translate it. */
  summary?: string
  className?: string
}

/**
 * Previous/next only — deliberately not numbered pages.
 *
 * §5.4 requires CursorPagination on the backend, which returns a cursor and no
 * total count: `OFFSET 50000` would take PostgreSQL down on a table of a
 * thousand clinics' patients. Without a total there is no page count to render,
 * and a "page 7" link would have nothing to point at. This is a consequence of
 * that decision, not a missing feature.
 */
export function Pagination({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  isLoading = false,
  previousLabel,
  nextLabel,
  summary,
  className,
}: PaginationProps) {
  return (
    <nav
      aria-label={summary ?? previousLabel}
      className={cn('flex items-center justify-between gap-4 py-3', className)}
    >
      {summary ? (
        // Announced on change so a keyboard user knows the page moved without
        // having to re-read the table.
        <p aria-live="polite" className="text-caption text-text-tertiary">
          {summary}
        </p>
      ) : (
        <span />
      )}

      <div className="flex gap-2">
        <Button
          disabled={!hasPrevious || isLoading}
          iconLeft={<ChevronLeft aria-hidden="true" className="size-4" />}
          onClick={onPrevious}
          size="sm"
          variant="secondary"
        >
          {previousLabel}
        </Button>
        <Button disabled={!hasNext || isLoading} onClick={onNext} size="sm" variant="secondary">
          {nextLabel}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
