/**
 * Money, formatted for display only.
 *
 * §7.3 forbids floats in financial arithmetic, and nothing here does
 * arithmetic — the backend stores so'm as `PositiveIntegerField` and sends
 * whole numbers, which JavaScript represents exactly well past any amount a
 * dental clinic will invoice. The moment a total needs to be *computed* rather
 * than shown, it belongs on the server.
 *
 * Two consequences of the column type are worth remembering when reading a
 * figure produced here: nothing can be negative, so a refund has no
 * representation, and the value caps at about 2.1 billion so'm.
 */

/**
 * `1 200 000 so'm`, in whichever way the active locale groups the digits.
 *
 * `Intl`'s plain `decimal` style, not `currency`: `style: 'currency'` with
 * `UZS` used to render the bare ISO code ("UZS 1,200,000") because most
 * runtimes have no localised symbol for it, which is the opposite of what
 * staff need to read on a bill. `currencyLabel` is the word instead —
 * `t('common:currency.som')` at the call site, so it comes from `t()` like
 * every other user-visible string (§11) rather than being hardcoded here.
 */
export function formatSom(amount: number, locale: string, currencyLabel: string): string {
  const number = new Intl.NumberFormat(locale, {
    // So'm has no subunit in practice; showing `,00` on every price is noise.
    maximumFractionDigits: 0,
  }).format(amount)
  return `${number} ${currencyLabel}`
}
