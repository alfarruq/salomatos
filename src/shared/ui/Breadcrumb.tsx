import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface BreadcrumbItem {
  label: string
  /**
   * Rendered as the link for this crumb — a router `<Link>` in practice.
   * The last item has none: it is where the user already is.
   *
   * ⛔ The label must not be a patient name if the crumb is ever screen-shared
   * (§13.4). Prefer "Bemor kartasi" over the name itself.
   */
  link?: (children: ReactNode) => ReactNode
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  /** Accessible name for the nav landmark, e.g. "Navigatsiya". */
  label: string
  className?: string
}

export function Breadcrumb({ items, label, className }: BreadcrumbProps) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li className="flex items-center gap-2" key={item.label}>
              {isLast || !item.link ? (
                <span
                  // Marks the current location for assistive tech, not just visually.
                  aria-current={isLast ? 'page' : undefined}
                  className={cn('text-callout', isLast ? 'text-text' : 'text-text-secondary')}
                >
                  {item.label}
                </span>
              ) : (
                item.link(
                  <span className="text-callout text-text-secondary hover:text-text">
                    {item.label}
                  </span>,
                )
              )}

              {isLast ? null : (
                <ChevronRight aria-hidden="true" className="size-3.5 text-text-tertiary" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
