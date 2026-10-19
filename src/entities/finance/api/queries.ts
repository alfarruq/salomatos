import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { cachePolicy } from '@/shared/config/cache'
import type { ReportRange } from '@/shared/lib/report'
import { financeOverviewSchema, toFinanceOverview } from '../model/schema'
import type { FinanceOverview } from '../model/types'
import { buildMockFinanceOverview } from './mockOverview'

export const financeKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'finance'] as const,

  overview: (clinicId: number, range: ReportRange) =>
    [...financeKeys.scope(clinicId), 'overview', range] as const,
}

/**
 * Drives the "sample data" notice and keeps the invented debtors from linking
 * to real patient cards. Goes away with the mock.
 */
export const FINANCE_SOURCE_IS_MOCK = true

/** Long enough for the skeleton to be seen, so the loading state is reviewed too. */
const MOCK_LATENCY_MS = 400

/**
 * ⚠️ Served from `./mockOverview.ts` until the backend has the endpoint. To
 * switch, replace the body with:
 *
 *   const params = new URLSearchParams({ from: range.from, to: range.to })
 *   const raw: unknown = await httpClient(`v1/clinic/finance/overview/?${params}`, { signal })
 *
 * and delete the mock file. The parse below stays as it is.
 */
export async function fetchFinanceOverview(
  range: ReportRange,
  signal?: AbortSignal,
): Promise<FinanceOverview> {
  const raw: unknown = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(buildMockFinanceOverview(range)), MOCK_LATENCY_MS)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
  return toFinanceOverview(v.parse(financeOverviewSchema, raw))
}

export const financeQueries = {
  overview: (clinicId: number, range: ReportRange) =>
    queryOptions({
      queryKey: financeKeys.overview(clinicId, range),
      queryFn: ({ signal }) => fetchFinanceOverview(range, signal),
      // Money: always refetched (§6.3), never optimistic.
      ...cachePolicy.financial,
      // Keeps the current figures on screen while another period loads.
      placeholderData: keepPreviousData,
    }),
}
