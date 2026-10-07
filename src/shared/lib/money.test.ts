import { describe, expect, it } from 'vitest'
import { formatSom } from './money'

describe('formatSom', () => {
  it('appends the given word rather than an ISO currency code', () => {
    // `style: 'currency'` with `UZS` is what used to print "UZS 4,000,000" —
    // most runtimes have no localised symbol for it, so this is spelled out
    // by the caller instead (`t('common:currency.som')`).
    expect(formatSom(4_000_000, 'en', "so'm")).toBe("4,000,000 so'm")
  })

  it('groups digits the way the active locale does, word aside', () => {
    // Not a literal space in the expected string: Russian's `Intl` grouping
    // separator is U+00A0/U+202F, not U+0020, and hardcoding the wrong one
    // here would make this test lie about what it verifies.
    const grouped = new Intl.NumberFormat('ru', { maximumFractionDigits: 0 }).format(4_000_000)
    expect(formatSom(4_000_000, 'ru', 'сум')).toBe(`${grouped} сум`)
  })

  it("drops the fractional part — so'm has no subunit in practice", () => {
    expect(formatSom(1500.75, 'en', "so'm")).toBe("1,501 so'm")
  })
})
