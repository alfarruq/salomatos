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

const CURRENCY = 'UZS'

/**
 * `1 200 000 so'm`, in whichever way the active locale writes it.
 *
 * `Intl`, not a hand-rolled thousands separator: Russian groups with a narrow
 * space and puts the symbol last, English groups with a comma and puts it
 * first, and getting that wrong in a bill is the kind of detail staff notice
 * immediately.
 */
export function formatSom(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: CURRENCY,
    // So'm has no subunit in practice; showing `,00` on every price is noise.
    maximumFractionDigits: 0,
  }).format(amount)
}
