/**
 * The backend wraps every error in one envelope (`apps/core/exceptions.py`):
 *
 *   { message, message_key, errors, exception_class }
 *
 * so the UI never sees a raw one — everything arrives as an `ApiError` with the
 * same fields, and a form can always ask "which field?" while a boundary can
 * always ask "is this retryable?".
 *
 * ⛔ An ApiError must not carry PHI: it ends up in Sentry (§13.4). Nothing here
 * copies the response body wholesale, and `exception_class` — an internal
 * Django class name — is deliberately dropped rather than surfaced.
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
  messageKey?: string | undefined
  requestId?: string | undefined
  status?: number | undefined
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly fieldErrors: FieldErrors
  /** The server's own prose. Always English — see `messageKey`. */
  readonly detail: string | undefined
  /**
   * The server's stable identifier for what went wrong (`invalid_credentials`,
   * `object_not_found`, ...).
   *
   * Worth carrying separately because the backend renders `message` through
   * `gettext` with `LANGUAGE_CODE = "en-us"` and never reads `Accept-Language`,
   * so the prose is English whatever the staff member's interface is set to.
   * The UI translates this key when it recognises it and falls back to
   * `detail` when it does not.
   */
  readonly messageKey: string | undefined
  /** Correlates with the Django log (§5.4). Safe to show; it is not PHI. */
  readonly requestId: string | undefined
  readonly status: number | undefined

  constructor(init: ApiErrorInit) {
    super(init.message ?? init.kind)
    this.name = 'ApiError'
    this.kind = init.kind
    this.fieldErrors = init.fieldErrors ?? {}
    this.detail = init.detail
    this.messageKey = init.messageKey
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

/**
 * Field errors arrive as DRF *codes*, not prose.
 *
 * `APIExceptionFormatter` replaces each `ErrorDetail` with its `.code`, so a
 * missing name comes back as `{"full_name": "required"}`. That is more useful
 * than the English sentence it replaced: prefixed with `validation.` it becomes
 * the same kind of translation key Valibot produces on the client, so §10's
 * "server errors land on the field" works in all four locales through one code
 * path.
 */
function toValidationKey(code: string): string {
  return `validation.${code}`
}

function collectFieldErrors(source: unknown, path: string, into: FieldErrors): void {
  if (typeof source === 'string') {
    into[path] = [...(into[path] ?? []), toValidationKey(source)]
    return
  }

  // A nested serializer keeps its dict shape, so `items.quantity` stays
  // addressable by react-hook-form's dotted paths.
  if (typeof source === 'object' && source !== null && !Array.isArray(source)) {
    for (const [key, value] of Object.entries(source)) {
      collectFieldErrors(value, path === '' ? key : `${path}.${key}`, into)
    }
  }
}

export interface DrfErrorSource {
  status: number
  body: unknown
  requestId?: string | undefined
}

/**
 * Turns the backend's error envelope into an ApiError.
 *
 * Survives the shapes that are not the envelope, because two exist:
 * `drf_exception_handler` answers a 404 with an empty body, and with
 * `DEBUG = True` an unhandled 500 returns Django's HTML traceback page rather
 * than JSON at all.
 */
export function normalizeDrfError({ status, body, requestId }: DrfErrorSource): ApiError {
  const kind = kindFromStatus(status)
  const fieldErrors: FieldErrors = {}
  let detail: string | undefined
  let messageKey: string | undefined

  /*
   * Only an object is read. A string body here is Django's HTML traceback
   * (DEBUG is on in production, see the backend review) and §13.4 keeps that
   * out of the interface and out of Sentry, so it is dropped rather than
   * surfaced as `detail`.
   */
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    const envelope = body as Record<string, unknown>

    if (typeof envelope.message === 'string') detail = envelope.message
    if (typeof envelope.message_key === 'string') messageKey = envelope.message_key

    collectFieldErrors(envelope.errors, '', fieldErrors)
  }

  return new ApiError({
    kind,
    status,
    detail,
    messageKey,
    fieldErrors,
    requestId,
    message: messageKey ?? kind,
  })
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
