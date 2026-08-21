import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface EmptyStateProps {
  /**
   * §11.6 — an empty screen invites the next action. "Hali bemor qo'shilmagan"
   * rather than "Ma'lumot yo'q".
   */
  title: string
  description?: string
  /**
   * Heading level for the title. An empty state names a region, so it is a
   * heading and not a paragraph — a screen reader user navigating by heading
   * should be able to find it. Defaults to 2 because these usually sit inside
   * a page that already has an h1; a standalone page passes 1.
   */
  headingLevel?: 1 | 2 | 3
  /** The action that fills the emptiness. Almost always worth providing. */
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  headingLevel = 2,
  className,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const
  return (
    <div
      className={cn(
        // Generous space is right here — §13 reserves density for tables and
        // lists, not for the moment there is nothing to be dense about.
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? <div className="text-text-tertiary">{icon}</div> : null}

      <div className="flex max-w-sm flex-col gap-2">
        <Heading className="text-title2 text-text">{title}</Heading>
        {description ? <p className="text-callout text-text-secondary">{description}</p> : null}
      </div>

      {action}
    </div>
  )
}
