import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    // Every route's beforeLoad reads the session through this (§8.2).
    context: { queryClient },
    // Preloads a route when the pointer settles on its link. The chunk and the
    // data are usually there before the click lands.
    defaultPreload: 'intent',
    // Query owns staleness; the router should not second-guess it.
    defaultPreloadStaleTime: 0,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
