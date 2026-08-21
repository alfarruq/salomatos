import { describe, expect, it } from 'vitest'
import { ApiError, kindFromStatus, normalizeDrfError } from './errors'

describe('normalizeDrfError', () => {
  it('reads per-field errors', () => {
    const error = normalizeDrfError({
      status: 400,
      body: { phone: ['Bu raqam band.'], first_name: ['Juda qisqa.'] },
    })

    expect(error.kind).toBe('validation')
    expect(error.fieldErrors['phone']).toEqual(['Bu raqam band.'])
    expect(error.fieldErrors['first_name']).toEqual(['Juda qisqa.'])
  })

  it('reads the generic detail message', () => {
    const error = normalizeDrfError({ status: 403, body: { detail: 'Ruxsat yo`q.' } })

    expect(error.kind).toBe('forbidden')
    expect(error.detail).toBe('Ruxsat yo`q.')
    // `detail` is not a field, so a form must not try to attach it to one.
    expect(error.fieldErrors).toEqual({})
  })

  it('keeps non_field_errors addressable', () => {
    const error = normalizeDrfError({
      status: 400,
      body: { non_field_errors: ['Login yoki parol xato.'] },
    })

    expect(error.fieldErrors['non_field_errors']).toEqual(['Login yoki parol xato.'])
  })

  it('flattens a nested serializer into addressable paths', () => {
    const error = normalizeDrfError({
      status: 400,
      body: { items: [{ quantity: ['Kamida 1.'] }, {}] },
    })

    expect(error.fieldErrors['items[0].quantity']).toEqual(['Kamida 1.'])
  })

  it('carries the request id so a user can quote it to support', () => {
    const error = normalizeDrfError({ status: 500, body: {}, requestId: 'req_01J8' })

    expect(error.requestId).toBe('req_01J8')
  })

  it('survives a body that is not an object', () => {
    expect(normalizeDrfError({ status: 500, body: null }).kind).toBe('server')
    expect(normalizeDrfError({ status: 502, body: 'Bad gateway' }).detail).toBe('Bad gateway')
  })
})

describe('kindFromStatus', () => {
  it('maps the statuses the UI branches on', () => {
    expect(kindFromStatus(400)).toBe('validation')
    expect(kindFromStatus(401)).toBe('unauthorized')
    expect(kindFromStatus(403)).toBe('forbidden')
    expect(kindFromStatus(404)).toBe('notFound')
    expect(kindFromStatus(409)).toBe('conflict')
    expect(kindFromStatus(429)).toBe('rateLimited')
    expect(kindFromStatus(503)).toBe('server')
  })
})

describe('ApiError', () => {
  it('knows what is worth retrying', () => {
    // Retrying a 403 just asks the server to refuse again.
    expect(new ApiError({ kind: 'forbidden' }).isRetryable).toBe(false)
    expect(new ApiError({ kind: 'validation' }).isRetryable).toBe(false)
    expect(new ApiError({ kind: 'network' }).isRetryable).toBe(true)
    expect(new ApiError({ kind: 'server' }).isRetryable).toBe(true)
  })
})
