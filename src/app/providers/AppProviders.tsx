import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { getActiveClinicId, type Session, sessionKeys, useSessionStore } from '@/entities/session'
import { configureApi } from '@/shared/api/httpContext'
import { Toaster, TooltipProvider } from '@/shared/ui'
import { createQueryClient } from './queryClient'

/**
 * Wires the pieces that have to know about each other exactly once.
 *
 * The HTTP client is told how to find the active clinic and what to do about a
 * 401 here, rather than importing that itself — `shared` may not reach up into
 * `entities` (§3.3), and injecting it keeps the client testable.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  // One client for the app's lifetime; recreating it on render would empty the
  // cache on every state change.
  const [queryClient] = useState(createQueryClient)
  const isConfigured = useRef(false)

  if (!isConfigured.current) {
    configureApi({
      getClinicId: getActiveClinicId,
      onUnauthorized: () => {
        /*
         * ADR-003: session auth, so there is nothing to refresh — an expired
         * session is a logout nobody chose.
         *
         * Only the store is cleared here. Clearing the *query cache* in
         * response to a 401 would cancel the request that reported it, and the
         * guard would see a CancelledError rather than `unauthorized` and show
         * an error screen instead of the login form. The cache is emptied on
         * arrival at /login, which is where the user ends up either way and
         * where nothing is in flight (§13.4).
         */
        useSessionStore.getState().clear()
      },
    })
    isConfigured.current = true
  }

  /*
   * Keeps the store in step with the query cache. The query is the source of
   * truth; the store exists so non-React code (the HTTP client) and narrow
   * selectors can read the session without subscribing to a query.
   */
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryHash !== JSON.stringify(sessionKeys.me())) return
      // The query function returns a parsed Session, so this narrowing is a
      // fact about sessionQueries.me() rather than an assumption.
      const data = event.query.state.data as Session | undefined
      useSessionStore.getState().setSession(data ?? null)
    })
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
