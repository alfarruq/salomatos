import { useQuery, useQueryClient } from '@tanstack/react-query'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PatientFilters, PatientId, PatientListItem } from '@/entities/patient'
import { patientQueries } from '@/entities/patient'
import { Can } from '@/entities/session'
import { CreatePatientDialog } from '@/features/patient-create'
import { PatientSearchInput, usePatientSearch } from '@/features/patient-search'
import { PAGE_SIZE } from '@/shared/api/pagination'
import {
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  QueryBoundary,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/shared/ui'
import { usePatientColumns } from '../model/usePatientColumns'

export interface PatientTableProps {
  clinicId: number
  /**
   * The shareable half of the filter state, owned by the route's search params.
   * ⛔ `search` is not among them — see `usePatientSearch`.
   */
  filters: Omit<PatientFilters, 'search'>
  onFiltersChange: (next: Omit<PatientFilters, 'search'>) => void
  onOpenPatient: (patientId: PatientId) => void
}

/**
 * The patient list: toolbar, table, pagination.
 *
 * A widget rather than a page section because this is where features compose
 * (§3.1) — search, create and the session's permission gate all meet here, and
 * none of them may import each other.
 */
export function PatientTable({
  clinicId,
  filters,
  onFiltersChange,
  onOpenPatient,
}: PatientTableProps) {
  const { t } = useTranslation(['patients', 'common'])
  const queryClient = useQueryClient()
  const [isCreateOpen, setCreateOpen] = useState(false)

  const search = usePatientSearch()
  const query = useQuery(
    patientQueries.list(clinicId, { ...filters, search: search.debouncedTerm }),
  )

  const handleSearchChange = (value: string) => {
    search.setTerm(value)
    // A narrower result set has fewer pages, and staying on page 4 of a
    // one-page result shows an empty table that looks like "no patients".
    if (filters.page !== 1) onFiltersChange({ ...filters, page: 1 })
  }

  /**
   * Warms the card before the click lands. The row is already on screen, so
   * the request costs nothing the user waits for, and opening a patient then
   * renders from cache.
   */
  const prefetchPatient = (patientId: PatientId) => {
    void queryClient.prefetchQuery(patientQueries.detail(clinicId, patientId))
  }

  const columns = usePatientColumns()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PatientSearchInput
          onChange={handleSearchChange}
          onClear={() => handleSearchChange('')}
          value={search.term}
        />

        {/* UX only — Django decides what may actually be created (§9.1). */}
        <Can permission="patient:write">
          <Button onClick={() => setCreateOpen(true)} size="sm" variant="primary">
            {t('patients:create.submit')}
          </Button>
        </Can>
      </div>

      <QueryBoundary
        empty={
          <EmptyState
            /*
             * §11.6 — an empty screen invites the next action. Which action
             * depends on why it is empty: a clinic with no patients yet should
             * be offered the form, while a search that matched nothing should
             * be offered its way back, because adding a patient is not what
             * that person was trying to do.
             */
            action={
              search.debouncedTerm === '' ? (
                <Can permission="patient:write">
                  <Button onClick={() => setCreateOpen(true)} variant="primary">
                    {t('patients:create.submit')}
                  </Button>
                </Can>
              ) : (
                <Button onClick={() => handleSearchChange('')} variant="secondary">
                  {t('patients:empty.showAll')}
                </Button>
              )
            }
            description={
              search.debouncedTerm === ''
                ? t('patients:empty.description')
                : t('patients:empty.searchDescription')
            }
            title={
              search.debouncedTerm === '' ? t('patients:empty.title') : t('patients:empty.noMatch')
            }
          />
        }
        error={({ retry }) => (
          <ErrorState
            description={t('common:error.pageBody')}
            retryLabel={t('common:action.retry')}
            title={t('common:error.pageTitle')}
            // See the detail page: `exactOptionalPropertyTypes` distinguishes
            // an absent prop from one set to undefined.
            {...(retry === undefined ? {} : { onRetry: retry })}
          />
        )}
        isEmpty={(page) => page.results.length === 0}
        loading={
          // TableSkeleton renders a <tbody>, so it needs the table around it.
          <Table density="compact">
            <TableSkeleton columns={columns.length} rows={PAGE_SIZE} />
          </Table>
        }
        query={query}
      >
        {(page) => (
          <>
            <PatientRows
              columns={columns}
              onOpenPatient={onOpenPatient}
              onPrefetch={prefetchPatient}
              rows={page.results}
            />

            <Pagination
              hasNext={page.next !== null}
              hasPrevious={page.previous !== null}
              isLoading={query.isFetching}
              nextLabel={t('common:action.next')}
              onNext={() => onFiltersChange({ ...filters, page: filters.page + 1 })}
              onPrevious={() => onFiltersChange({ ...filters, page: filters.page - 1 })}
              previousLabel={t('common:action.previous')}
              /*
               * A real total, which cursor pagination could not have given
               * (see the component's own note) — `count` is what makes a
               * position line expressible here at all.
               *
               * Numbers only, no counted noun: Russian would need three plural
               * forms for "patients" and the position is unambiguous without
               * it.
               */
              summary={t('patients:pagination.summary', {
                count: page.count,
                from: (filters.page - 1) * PAGE_SIZE + 1,
                to: Math.min(filters.page * PAGE_SIZE, page.count),
              })}
            />
          </>
        )}
      </QueryBoundary>

      <CreatePatientDialog clinicId={clinicId} onOpenChange={setCreateOpen} open={isCreateOpen} />
    </div>
  )
}

function PatientRows({
  rows,
  columns,
  onOpenPatient,
  onPrefetch,
}: {
  rows: PatientListItem[]
  columns: ReturnType<typeof usePatientColumns>
  onOpenPatient: (patientId: PatientId) => void
  onPrefetch: (patientId: PatientId) => void
}) {
  /*
   * Headless table, so the markup stays `shared/ui`'s and the density,
   * focus ring and touch targets from §11.7 come for free.
   *
   * ⛔ Not virtualised, and the roadmap's "100+ rows → react-virtual" does not
   * apply: the server paginates at ten (`PAGE_SIZE`), so a hundred rows never
   * reach the DOM. Adding the dependency would cost bundle for a condition
   * that cannot occur until the page size is made configurable.
   */
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <Table density="compact">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead align={header.column.columnDef.meta?.align ?? 'left'} key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>

      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            isInteractive
            key={row.id}
            onClick={() => onOpenPatient(row.original.id)}
            onFocus={() => onPrefetch(row.original.id)}
            onMouseEnter={() => onPrefetch(row.original.id)}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell align={cell.column.columnDef.meta?.align ?? 'left'} key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
