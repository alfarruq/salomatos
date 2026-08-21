import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/shared/api/errors'
import { cachePolicy } from '@/shared/config/cache'

/**
 * §6.4. Two decisions here matter more than the rest:
 *
 * Retries are driven by whether retrying could plausibly help. Asking the
 * server a second time whether we are allowed to do something we are not is
 * pure latency.
 *
 * Nothing is persisted. `persistQueryClient` is not used and must not be
 * (ADR-007): the reception desk computer is shared, and a cached patient list
 * in localStorage outlives the shift that created it.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...cachePolicy.standard,

        retry: (failureCount, error) => {
          if (isApiError(error) && !error.isRetryable) return false
          return failureCount < 2
        },

        // Only genuine server faults reach an ErrorBoundary. A 404 is a state
        // the screen should render, not a crash.
        throwOnError: (error) => isApiError(error) && error.kind === 'server',
      },

      mutations: {
        // A retried mutation can book the same slot twice or take a payment
        // twice. Never automatic (§6.4).
        retry: false,
      },
    },
  })
}
