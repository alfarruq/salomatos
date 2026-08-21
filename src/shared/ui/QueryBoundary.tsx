import type { ReactNode } from 'react'

/**
 * The four states §15 requires on every data screen, resolved in one place so
 * a screen cannot accidentally ship with three of them.
 *
 * Deliberately typed against the shape it uses rather than `UseQueryResult`,
 * so an infinite query, a suspense query or a test double all fit.
 */
export interface QueryLike<TData> {
  data: TData | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  refetch?: () => void
}

export interface QueryBoundaryProps<TData> {
  query: QueryLike<TData>
  /** Skeleton, never a spinner — the layout must not jump (§15). */
  loading: ReactNode
  /** Shown when the request succeeded but there is nothing to show. */
  empty?: ReactNode
  /**
   * Rendered on failure. When omitted the error is re-thrown so the nearest
   * ErrorBoundary handles it — which is why §15 asks for boundaries at route
   * and widget level. Swallowing the error here would hide it from both.
   */
  error?: (props: { error: unknown; retry: (() => void) | undefined }) => ReactNode
  /**
   * Decides emptiness for data that is not a plain array — an infinite query's
   * pages, or a shape with its own `results`.
   */
  isEmpty?: (data: TData) => boolean
  children: (data: TData) => ReactNode
}

function defaultIsEmpty(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0
}

export function QueryBoundary<TData>({
  query,
  loading,
  empty,
  error,
  isEmpty = defaultIsEmpty,
  children,
}: QueryBoundaryProps<TData>) {
  if (query.isPending) {
    return <>{loading}</>
  }

  if (query.isError) {
    if (error === undefined) {
      throw query.error
    }
    return <>{error({ error: query.error, retry: query.refetch })}</>
  }

  // `isPending` false and `isError` false means the request resolved, so
  // undefined data here would be a contract violation rather than a state.
  if (query.data === undefined) {
    throw new Error('QueryBoundary: query settled without data')
  }

  if (empty !== undefined && isEmpty(query.data)) {
    return <>{empty}</>
  }

  return <>{children(query.data)}</>
}
