import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it("keeps a variant's text colour beside a size's font size", () => {
    // Button: variant then size. Without the theme extension the size's
    // `text-body` dropped `text-on-accent`, leaving dark text on blue.
    expect(cn('bg-accent text-on-accent', 'h-11 px-4 text-body')).toBe(
      'bg-accent text-on-accent h-11 px-4 text-body',
    )
  })

  it('still lets a later colour replace an earlier one', () => {
    expect(cn('text-text', 'text-on-accent')).toBe('text-on-accent')
  })

  it('still lets a later font size replace an earlier one', () => {
    expect(cn('text-body', 'text-caption')).toBe('text-caption')
  })
})
