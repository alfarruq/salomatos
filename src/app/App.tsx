import { UiGallery } from './dev/UiGallery'

/**
 * Placeholder shell. The router, providers and real layout arrive in phase 4
 * (ROADMAP 4.2), at which point /dev/ui becomes a proper dev-only route and
 * this pathname check goes away.
 */
export function App() {
  // `import.meta.env.DEV` is statically replaced, so the gallery and everything
  // it pulls in are dropped from the production bundle entirely.
  if (import.meta.env.DEV && window.location.pathname === '/dev/ui') {
    return <UiGallery />
  }

  return (
    <main>
      <h1>SalomatOS</h1>
    </main>
  )
}
