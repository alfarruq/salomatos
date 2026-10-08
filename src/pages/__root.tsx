import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary, ErrorState } from '@/shared/ui'

export interface RouterContext {
  /**
   * Lets `beforeLoad` read the session through the cache instead of refetching
   * it on every navigation (§8.2).
   */
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const { t } = useTranslation('common')

  return (
    /*
     * The route-level boundary from §15: one page failing leaves navigation and
     * the rest of the shell working. In a clinic a partly working app beats a
     * dead one.
     */
    <ErrorBoundary
      fallback={({ reset }) => (
        <ErrorState
          description={t('error.pageBody')}
          onRetry={reset}
          retryLabel={t('action.retry')}
          title={t('error.pageTitle')}
        />
      )}
    >
      <Outlet />
    </ErrorBoundary>
  )
}
