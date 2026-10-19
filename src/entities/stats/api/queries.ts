import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { cachePolicy } from '@/shared/config/cache'
import { statsOverviewSchema, toStatsOverview } from '../model/schema'
import type { StatsOverview, StatsRange } from '../model/types'
import { buildMockStatsOverview } from './mockOverview'

export const statsKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'stats'] as const,

  overview: (clinicId: number, range: StatsRange) =>
    [...statsKeys.scope(clinicId), 'overview', range] as const,
}

/** Drives the "sample data" notice on screen. Goes away with the mock. */
export const STATS_SOURCE_IS_MOCK = true

/** Long enough for the skeleton to be seen, so the loading state is reviewed too. */
const MOCK_LATENCY_MS = 400

/**
 * ⚠️ Served from `./mockOverview.ts` until the backend has the endpoint. To
 * switch, replace the body with:
 *
 *   const params = new URLSearchParams({ from: range.from, to: range.to })
 *   const raw: unknown = await httpClient(`v1/clinic/stats/overview/?${params}`, { signal })
 *
 * and delete the mock file. The parse below stays as it is.
 */
export async function fetchStatsOverview(
  range: StatsRange,
  signal?: AbortSignal,
): Promise<StatsOverview> {
  const raw: unknown = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(buildMockStatsOverview(range)), MOCK_LATENCY_MS)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
  return toStatsOverview(v.parse(statsOverviewSchema, raw))
}

export const statsQueries = {
  overview: (clinicId: number, range: StatsRange) =>
    queryOptions({
      queryKey: statsKeys.overview(clinicId, range),
      queryFn: ({ signal }) => fetchStatsOverview(range, signal),
      ...cachePolicy.standard,
      // Keeps the current charts on screen while another period loads.
      placeholderData: keepPreviousData,
    }),
}
