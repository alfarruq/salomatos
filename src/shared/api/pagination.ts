import * as v from 'valibot'

/**
 * DRF's `PageNumberPagination` envelope.
 *
 * §5.4 asks for `CursorPagination` and gives a good reason: `OFFSET 50000` on a
 * thousand clinics' patient tables is how PostgreSQL is brought down. This
 * backend configures `PageNumberPagination` with `PAGE_SIZE = 10`
 * (`apps/core/utils.py`), so that is what the client reads.
 *
 * One thing genuinely improves as a result: `count` exists. Cursor pagination
 * cannot report a total, which is why `shared/ui/Pagination` was built without
 * numbered pages. With a count, "47 patients" and a last page are both
 * expressible.
 *
 * ⚠️ And one thing gets worse, which the list screens have to allow for: page
 * numbers are only stable if the ordering is. `CreatedUpdatedAbstractModel`
 * orders by `-created_at` and that column is nullable, so rows with a null can
 * shuffle between requests and appear twice or not at all. Nothing the client
 * can fix; worth knowing before trusting a page boundary.
 */
export interface Page<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Wraps an item schema in the envelope, so each entity declares only its row. */
export function pageSchema<TSchema extends v.GenericSchema>(item: TSchema) {
  return v.object({
    count: v.number(),
    next: v.nullable(v.string()),
    previous: v.nullable(v.string()),
    results: v.array(item),
  })
}

/** Page size is the server's; this mirrors `PAGE_SIZE` so callers can do arithmetic. */
export const PAGE_SIZE = 10

export function pageCount(total: number, size: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size))
}
