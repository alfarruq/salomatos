import { describe, expect, it } from 'vitest'
import { doctorColorOf } from './color'

describe('doctorColorOf', () => {
  it('gives the same doctor the same colour every time', () => {
    expect(doctorColorOf(18)).toEqual(doctorColorOf(18))
  })

  it('tells neighbouring doctors apart', () => {
    expect(doctorColorOf(2).dot).not.toBe(doctorColorOf(3).dot)
  })

  it('falls back to a neutral dot when no doctor is assigned', () => {
    expect(doctorColorOf(null).dot).toBe('bg-border-strong')
  })
})
