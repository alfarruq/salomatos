import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProviders } from './providers/AppProviders'
import './styles/theme.css'

const container = document.getElementById('root')

// A missing mount point is a broken build, not a runtime condition to recover
// from — fail loudly rather than rendering into nothing.
if (!container) {
  throw new Error('Root container #root not found in index.html')
}

/*
 * Both conditions sit outside the import, not inside the imported function.
 *
 * A guard *inside* `startMockApi` would not keep msw out of the bundle: the
 * static import is evaluated regardless, and a module with import-time side
 * effects cannot be tree-shaken out of dead code. That is how the mock backend
 * — and its fabricated patient records — ended up in a production build,
 * caught by the size budget at 198 kB against a 180 kB limit.
 *
 * Constant-folded to `false` in a production build, so Rollup emits no chunk
 * for it at all. Awaited so the first request cannot outrun the worker.
 */
if (import.meta.env.DEV && import.meta.env['VITE_USE_MOCKS'] === 'true') {
  const { startMockApi } = await import('@/shared/api/mocks/browser')
  await startMockApi()
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
