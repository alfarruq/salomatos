import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * The same handlers, for tests (§16.3). Component tests therefore exercise the
 * real httpClient — CSRF header, error normalisation, the 401 path — instead of
 * a stubbed fetch that would agree with whatever the code happens to do.
 */
export const server = setupServer(...handlers)
