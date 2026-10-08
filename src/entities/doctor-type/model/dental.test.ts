import { describe, expect, it } from 'vitest'
import { isDentalDoctorType } from './dental'

describe('isDentalDoctorType', () => {
  it.each([
    'Stomatolog',
    'Stamatolog',
    'stamatolog',
    '  Stomatolog ',
    'Стоматолог',
    'Stomatolog-terapevt',
  ])('recognises %j', (name) => {
    expect(isDentalDoctorType(name)).toBe(true)
  })

  it.each(['Pediator', 'Nervpatolog', 'Ortodont', ''])('rejects %j', (name) => {
    expect(isDentalDoctorType(name)).toBe(false)
  })

  it('treats a doctor with no type as not dental', () => {
    expect(isDentalDoctorType(null)).toBe(false)
  })
})
