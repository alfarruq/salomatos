import { describe, expect, it } from 'vitest'
import { maskTypedDate } from './DateInput'

describe('maskTypedDate', () => {
  it('adds the slashes as the digits arrive', () => {
    expect(maskTypedDate('1')).toBe('1')
    expect(maskTypedDate('120')).toBe('12/0')
    expect(maskTypedDate('12051994')).toBe('12/05/1994')
  })

  it('drops anything that is not a digit and stops at eight digits', () => {
    expect(maskTypedDate('12.05.1994')).toBe('12/05/1994')
    expect(maskTypedDate('120519941')).toBe('12/05/1994')
  })
})
