import { cn } from '@/shared/lib/cn'

export interface BarListItem {
  key: string
  label: string
  value: number
}

export interface BarListProps {
  items: readonly BarListItem[]
  /** Names the list for assistive tech. */
  label: string
  formatValue?: (value: number) => string
  className?: string
}

/**
 * Ranked horizontal bars: a name, a bar and its number on one row. Better than
 * columns when the labels are names — they stay readable instead of rotating.
 * Each row states its own value, so nothing is read from the bar alone.
 */
export function BarList({ items, label, formatValue = String, className }: BarListProps) {
  const max = Math.max(1, ...items.map((item) => item.value))

  return (
    <ul aria-label={label} className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => (
        <li className="flex flex-col gap-1" key={item.key}>
          <div className="flex items-baseline justify-between gap-3 text-callout">
            <span className="truncate text-text">{item.label}</span>
            <span className="shrink-0 text-text-secondary tabular-nums">
              {formatValue(item.value)}
            </span>
          </div>
          <div aria-hidden="true" className="h-2 rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
