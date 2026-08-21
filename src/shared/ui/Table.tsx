import { type ComponentPropsWithoutRef, createContext, useContext } from 'react'
import { cn } from '@/shared/lib/cn'

export type TableDensity = 'compact' | 'comfortable'

const DensityContext = createContext<TableDensity>('compact')

export interface TableProps extends Omit<ComponentPropsWithoutRef<'table'>, 'className'> {
  /**
   * §13 — staff need to see many rows at once, so a patient list, a schedule
   * and a ledger all default to compact. `comfortable` is for short tables
   * where scanning matters more than volume.
   */
  density?: TableDensity
  className?: string
}

/**
 * Presentation only. Sorting, selection and virtualisation belong to TanStack
 * Table in the widget that owns the data — this layer just renders whatever it
 * is handed, so the same look applies everywhere.
 */
export function Table({ density = 'compact', className, ...props }: TableProps) {
  return (
    <DensityContext.Provider value={density}>
      {/*
       * A table is the one thing that legitimately overflows on a 360px screen.
       * It scrolls inside its own container so the page itself never does.
       */}
      <div className="w-full overflow-x-auto">
        <table className={cn('w-full border-collapse text-left', className)} {...props} />
      </div>
    </DensityContext.Provider>
  )
}

export function TableHeader({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead
      className={cn('border-b border-border bg-canvas', className)}
      // Sticky by default: scrolling a hundred rows without column names is
      // how a receptionist reads the wrong column.
      {...props}
    />
  )
}

export function TableBody({ className, ...props }: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody className={className} {...props} />
}

export interface TableRowProps extends ComponentPropsWithoutRef<'tr'> {
  /** Highlights the row and hints that it opens something. */
  isInteractive?: boolean
  isSelected?: boolean
}

export function TableRow({ isInteractive, isSelected, className, ...props }: TableRowProps) {
  return (
    <tr
      data-selected={isSelected || undefined}
      className={cn(
        'border-b border-border last:border-b-0',
        'transition-colors duration-150 ease-out-apple',
        isInteractive === true && 'cursor-pointer hover:bg-sunken',
        isSelected === true && 'bg-accent-soft',
        className,
      )}
      {...props}
    />
  )
}

const densityPadding: Record<TableDensity, string> = {
  compact: 'px-3 py-2',
  comfortable: 'px-4 py-3',
}

export interface TableHeadProps extends ComponentPropsWithoutRef<'th'> {
  align?: 'left' | 'right' | 'center'
}

export function TableHead({ align = 'left', className, ...props }: TableHeadProps) {
  const density = useContext(DensityContext)

  return (
    <th
      scope="col"
      className={cn(
        densityPadding[density],
        'text-caption font-medium whitespace-nowrap text-text-tertiary',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  )
}

export interface TableCellProps extends ComponentPropsWithoutRef<'td'> {
  align?: 'left' | 'right' | 'center'
  /** Tabular figures so digits line up down a money or count column. */
  isNumeric?: boolean
}

export function TableCell({ align = 'left', isNumeric, className, ...props }: TableCellProps) {
  const density = useContext(DensityContext)

  return (
    <td
      className={cn(
        densityPadding[density],
        'text-callout text-text',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        isNumeric === true && 'font-mono tabular-nums',
        className,
      )}
      {...props}
    />
  )
}

/** Row of skeletons matching the table's shape — the loading state from §15. */
export function TableSkeleton({ rows = 10, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <TableBody>
      {Array.from({ length: rows }, (_, rowIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity and never reorder
        <TableRow key={`skeleton-row-${rowIndex}`}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity and never reorder
            <TableCell key={`skeleton-cell-${columnIndex}`}>
              <div className="h-4 w-full animate-pulse rounded-control bg-sunken" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}
