import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface EmptyStateProps {
  /**
   * §11.6 — an empty screen invites the next action. "Hali bemor qo'shilmagan"
   * rather than "Ma'lumot yo'q".
   */
  title: string
  description?: string
  /** The action that fills the emptiness. Almost always worth providing. */
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
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
        <p className="text-title2 text-text">{title}</p>
        {description ? <p className="text-callout text-text-secondary">{description}</p> : null}
      </div>

      {action}
    </div>
  )
}
