import { AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Button } from './Button'

export interface ErrorStateProps {
  /**
   * §11.6 — say what happened and what to do. Not "Xatolik yuz berdi", and
   * never an apology or an error code the user cannot act on.
   */
  title: string
  description?: string
  /** Label for the retry button. Omit `onRetry` when nothing can be retried. */
  retryLabel?: string
  onRetry?: () => void
  /**
   * Correlates with the Django log (§5.4). Shown small and selectable so a
   * user can read it to support — it is not an explanation, it is a reference.
   */
  requestId?: string
  className?: string
}

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  requestId,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      <AlertTriangle aria-hidden="true" className="size-6 text-danger" />

      <div className="flex max-w-sm flex-col gap-2">
        <p className="text-title2 text-text">{title}</p>
        {description ? <p className="text-callout text-text-secondary">{description}</p> : null}
      </div>

      {onRetry && retryLabel ? (
        <Button onClick={onRetry} variant="secondary">
          {retryLabel}
        </Button>
      ) : null}

      {requestId ? (
        <code className="font-mono text-caption text-text-tertiary select-all">{requestId}</code>
      ) : null}
    </div>
  )
}
