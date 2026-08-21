/**
 * DRF returns errors in at least four shapes (§5.3). The UI never sees a raw
 * one — everything arrives as an `ApiError` with the same fields, so a form can
 * always ask "which field?" and a boundary can always ask "is this retryable?".
 *
 * ⛔ An ApiError must not carry PHI: it ends up in Sentry (§13.4). The backend
 * is required not to put names or phone numbers in error text, and nothing here
 * copies the response body wholesale.
 */

export type ApiErrorKind =
  | 'validation' // 400 — per-field problems
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'conflict' // 409 — e.g. the appointment slot was taken
  | 'rateLimited' // 429
  | 'server' // 5xx
  | 'network' // never reached the server

/** Field name → messages. Handed straight to react-hook-form (§10). */
export type FieldErrors = Record<string, string[]>

interface ApiErrorInit {
  kind: ApiErrorKind
  // `| undefined` rather than plain optional: under exactOptionalPropertyTypes
  // the two differ, and callers legitimately pass a value that may be absent.
  message?: string | undefined
  fieldErrors?: FieldErrors | undefined
  detail?: string | undefined
  requestId?: string | undefined
  status?: number | undefined
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly fieldErrors: FieldErrors
  readonly detail: string | undefined
  /** Correlates with the Django log (§5.4). Safe to show; it is not PHI. */
  readonly requestId: string | undefined
  readonly status: number | undefined

  constructor(init: ApiErrorInit) {
    super(init.message ?? init.kind)
    this.name = 'ApiError'
    this.kind = init.kind
    this.fieldErrors = init.fieldErrors ?? {}
    this.detail = init.detail
    this.requestId = init.requestId
    this.status = init.status
  }

  /** True when retrying could plausibly succeed. Used by the query retry rule. */
  get isRetryable(): boolean {
    return this.kind === 'network' || this.kind === 'server' || this.kind === 'rateLimited'
  }
}

export function kindFromStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return 'validation'
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'notFound'
    case 409:
      return 'conflict'
    case 429:
      return 'rateLimited'
    default:
      return status >= 500 ? 'server' : 'validation'
  }
}

/** DRF nests errors arbitrarily deep; this flattens to `a.b[0].c` style keys. */
function collect(value: unknown, path: string, into: FieldErrors): void {
  if (typeof value === 'string') {
    into[path] = [...(into[path] ?? []), value]
    return
  }

  if (Array.isArray(value)) {
    // A list of plain strings is the common case: { "email": ["Required."] }
    if (value.every((entry) => typeof entry === 'string')) {
      into[path] = [...(into[path] ?? []), ...(value as string[])]
      return
    }
    // A list of objects means a nested serializer: { "items": [{ "qty": [...] }] }
    value.forEach((entry, index) => {
      collect(entry, `${path}[${index}]`, into)
    })
    return
  }

  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      collect(child, path ? `${path}.${key}` : key, into)
    }
  }
}

export interface DrfErrorSource {
  status: number
  body: unknown
  requestId?: string | undefined
}

/**
 * Turns any DRF error body into an ApiError.
 *
 * Handles the four documented shapes:
 *   { "field": ["msg"] }          → fieldErrors.field
 *   { "detail": "msg" }           → detail
 *   { "non_field_errors": [...] } → fieldErrors.non_field_errors
 *   nested serializers            → fieldErrors["items[0].qty"]
 */
export function normalizeDrfError({ status, body, requestId }: DrfErrorSource): ApiError {
  const kind = kindFromStatus(status)
  const fieldErrors: FieldErrors = {}
  let detail: string | undefined

  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    const record = body as Record<string, unknown>

    for (const [key, value] of Object.entries(record)) {
      // `detail` is DRF's generic message and is not a field.
      if (key === 'detail' && typeof value === 'string') {
        detail = value
        continue
      }
      collect(value, key, fieldErrors)
    }
  } else if (typeof body === 'string' && body.length > 0) {
    detail = body
  }

  return new ApiError({
    kind,
    status,
    detail,
    fieldErrors,
    requestId,
    message: detail ?? kind,
  })
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
