import ky, { HTTPError, TimeoutError } from 'ky'
import { ApiError, normalizeDrfError } from './errors'
import { getApiContext } from './httpContext'

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Django's CSRF cookie is deliberately readable by JS; the session cookie is not. */
export function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match?.[1] === undefined ? null : decodeURIComponent(match[1])
}

/*
 * §1.2 — the API is always same-origin behind nginx. The origin is read from
 * the page rather than configured, so there is no environment variable that
 * could ever point this at another host and reintroduce CORS and cross-site
 * cookies. ky 2 parses the prefix as a URL and rejects a bare `/api`.
 */
const API_PREFIX = `${globalThis.location.origin}/api`

export const api = ky.create({
  prefix: API_PREFIX,
  credentials: 'same-origin',
  timeout: 20_000,

  retry: {
    limit: 2,
    // GET only. Retrying a POST could book the same appointment twice.
    methods: ['get'],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },

  // ky 2 hands each hook a state object; §5.2's snippet predates that.
  hooks: {
    beforeRequest: [
      ({ request }) => {
        if (UNSAFE_METHODS.has(request.method.toUpperCase())) {
          const csrf = readCookie('csrftoken')
          if (csrf !== null) request.headers.set('X-CSRFToken', csrf)
        }

        const clinicId = getApiContext().getClinicId()
        if (clinicId !== null) request.headers.set('X-Clinic-Id', clinicId)
      },
    ],

    afterResponse: [
      ({ response }) => {
        /*
         * ADR-003: the web client uses Django session authentication, so there
         * is no refresh endpoint to call and nothing to retry. A 401 means the
         * session is gone — hand off once and let the error surface.
         *
         * Deferred to a microtask so application code never runs inside this
         * request's own promise chain. A handler that touched the query cache
         * would otherwise cancel the very request that triggered it, and the
         * caller would receive a CancelledError instead of the `unauthorized`
         * ApiError the route guard branches on.
         */
        if (response.status === 401) {
          queueMicrotask(() => {
            getApiContext().onUnauthorized()
          })
        }
        return response
      },
    ],
  },
})

/**
 * Every request goes through here, so the UI only ever sees `ApiError`.
 *
 * Also the mutator Orval is configured to use (§5.1), which is why the
 * signature is `(url, options) => Promise<T>`.
 */
export async function httpClient<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await api(url, options as never)
    // 204 and friends have no body; asking for JSON would throw.
    if (response.status === 204) return undefined as T
    return await response.json<T>()
  } catch (error) {
    throw toApiError(error)
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof HTTPError) {
    /*
     * `error.data`, not `error.response.json()`. ky 2 pre-parses the body and
     * consumes the response doing so, so reading it again yields nothing —
     * which silently emptied every field error and left users with "something
     * went wrong" instead of the message DRF sent (§10).
     */
    return normalizeDrfError({
      status: error.response.status,
      body: error.data,
      requestId: error.response.headers.get('X-Request-Id') ?? undefined,
    })
  }

  if (error instanceof TimeoutError) {
    return new ApiError({ kind: 'network', message: 'timeout' })
  }

  if (error instanceof ApiError) return error

  // Offline, DNS failure, a request the browser refused to make.
  return new ApiError({ kind: 'network', message: 'network_error' })
}
