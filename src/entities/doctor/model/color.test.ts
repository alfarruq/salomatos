import { describe, expect, it } from 'vitest'
import { doctorColorOf } from './color'

describe('doctorColorOf', () => {
  it('gives the same doctor the same colour every time', () => {
    expect(doctorColorOf(18)).toEqual(doctorColorOf(18))
  })

  it('tells neighbouring doctors apart', () => {
    expect(doctorColorOf(2).stripe).not.toBe(doctorColorOf(3).stripe)
  })

  it('falls back to a neutral stripe when no doctor is assigned', () => {
    expect(doctorColorOf(null).stripe).toBe('border-l-border-strong')
  })
})
