import { lazy, Suspense } from 'react'

/**
 * Lazy rather than a plain import guarded by `import.meta.env.DEV`.
 *
 * The guard alone is not enough: dead-code elimination cannot drop a module
 * that has side effects at import time — sonner injects its stylesheet on
 * load — so the reference page was dragging its dependencies into the
 * production entry chunk. A dynamic import puts them in a chunk that is only
 * ever requested by /dev/ui.
 */
const UiGallery = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import('./dev/UiGallery')).UiGallery }))
  : () => null

/**
 * Placeholder shell. The router, providers and real layout arrive in phase 4
 * (ROADMAP 4.2), at which point /dev/ui becomes a proper dev-only route and
 * this pathname check goes away.
 */
export function App() {
  if (import.meta.env.DEV && window.location.pathname === '/dev/ui') {
    return (
      <Suspense fallback={null}>
        <UiGallery />
      </Suspense>
    )
  }

  return (
    <main>
      <h1>SalomatOS</h1>
    </main>
  )
}
