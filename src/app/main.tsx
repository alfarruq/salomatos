import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { restoreSession } from '@/shared/api/authSession'
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
 * Synchronous, and before the first render: the router (created inside
 * `App`) reads the token through `tokenStore` on its very first `beforeLoad`,
 * so this has to land before that render happens at all, not in an effect.
 */
restoreSession()

/*
 * ⛔ There is no mock backend here any more, and there must not be one again.
 *
 * The app talks to Django, in development as in production — the dev server
 * proxies `/api` at it (see vite.config.ts). A mock that can be switched on is
 * a mock that can be switched on by accident, and what it serves is invented
 * patient records that look exactly like real ones.
 *
 * It also hid a real defect: every endpoint path was wrong for weeks, and the
 * mocks did not notice because the same misreading produced both them and the
 * client. Only a real server disagreed.
 */

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
