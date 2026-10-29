import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { statsOverviewSchema, toStatsOverview } from '../model/schema'
import type { StatsOverview, StatsRange } from '../model/types'

export const statsKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'stats'] as const,

  /** `mine` is the signed-in doctor's own figures: a separate key, never mixed with the clinic's. */
  overview: (clinicId: number, range: StatsRange, scope: StatsScope = 'clinic') =>
    [...statsKeys.scope(clinicId), scope === 'mine' ? 'mine' : 'overview', range] as const,
}

export type StatsScope = 'clinic' | 'mine'

export async function fetchStatsOverview(
  range: StatsRange,
  signal?: AbortSignal,
): Promise<StatsOverview> {
  const params = new URLSearchParams({ from: range.from, to: range.to })
  const raw = await httpClient<unknown>(
    `v1/statistics/overview/?${params}`,
    signal === undefined ? {} : { signal },
  )
  return toStatsOverview(v.parse(statsOverviewSchema, raw))
}

/** The same report, counting only the signed-in doctor's work. */
export async function fetchMyStatsOverview(
  range: StatsRange,
  signal?: AbortSignal,
): Promise<StatsOverview> {
  const params = new URLSearchParams({ from: range.from, to: range.to })
  const raw = await httpClient<unknown>(
    `v1/statistics/me/?${params}`,
    signal === undefined ? {} : { signal },
  )
  return toStatsOverview(v.parse(statsOverviewSchema, raw))
}

export const statsQueries = {
  overview: (clinicId: number, range: StatsRange, scope: StatsScope = 'clinic') =>
    queryOptions({
      queryKey: statsKeys.overview(clinicId, range, scope),
      queryFn: ({ signal }) =>
        scope === 'mine' ? fetchMyStatsOverview(range, signal) : fetchStatsOverview(range, signal),
      ...cachePolicy.standard,
      // Keeps the current charts on screen while another period loads.
      placeholderData: keepPreviousData,
    }),
}
