import { describe, expect, it } from 'vitest'
import { serverPagesFor } from './screenPages'

describe('serverPagesFor', () => {
  it('opens the first screen on its first server page and grows from there', () => {
    expect(serverPagesFor(1, 1)).toEqual([1])
    expect(serverPagesFor(1, 3)).toEqual([1, 2, 3])
  })

  it('maps every later screen to the next three server pages', () => {
    expect(serverPagesFor(2, 3)).toEqual([4, 5, 6])
    expect(serverPagesFor(3, 3)).toEqual([7, 8, 9])
  })
})
