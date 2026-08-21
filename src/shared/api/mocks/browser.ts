import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * Starts the mock backend in the browser.
 *
 * ⚠️ The dev/VITE_USE_MOCKS guard lives at the *call site* in main.tsx, not
 * here. A check inside this function would still leave the module — and msw,
 * and the fabricated patient records next door — in the production bundle,
 * because a module with import-time side effects cannot be tree-shaken out of
 * dead code. A mock backend that shipped would serve invented patient data as
 * if it were real: worse than an outage, because nothing looks broken.
 *
 * CI greps dist/ to keep it out.
 */
export async function startMockApi(): Promise<void> {
  await worker.start({
    // Anything the handlers do not cover reaches the real dev proxy, so mocks
    // can be retired endpoint by endpoint as the backend lands.
    onUnhandledRequest: 'bypass',
    quiet: true,
  })
}
