/** Integer, not a UUID — ADR-013. */
export type TreatmentTypeId = number

/**
 * A service the clinic offers, with its price.
 *
 * Called `TreatmentType` on the server and shown as "services" in the
 * interface — the domain name is kept here because `Treatment.treatment_type`
 * points at it, and renaming it in the client would mean translating back at
 * every call site.
 */
export interface TreatmentType {
  id: TreatmentTypeId
  name: string
  /**
   * Whole so'm, or null when the clinic has not set one.
   *
   * `PositiveIntegerField`, so §7.3's ban on floats is satisfied by the column
   * itself. It also means a price cannot be negative and caps around 2.1
   * billion so'm.
   */
  price: number | null
}
