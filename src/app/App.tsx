import { useQueryClient } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { createAppRouter } from './router'

/**
 * Lazy, and behind a constant-folded condition, so a production build emits no
 * chunk for it at all.
 *
 * The reference page stays outside the router rather than becoming a route:
 * a file-based route is always compiled into the tree, so it would ship as a
 * chunk even though nothing links to it. The pathname check keeps the
 * guarantee that CI enforces — dist/ contains none of it.
 */
const UiGallery = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import('./dev/UiGallery')).UiGallery }))
  : () => null

export function App() {
  const queryClient = useQueryClient()
  // Once for the app's lifetime: a new router would remount every page.
  const [router] = useState(() => createAppRouter(queryClient))

  if (import.meta.env.DEV && window.location.pathname === '/dev/ui') {
    return (
      <Suspense fallback={null}>
        <UiGallery />
      </Suspense>
    )
  }

  return <RouterProvider router={router} />
}
