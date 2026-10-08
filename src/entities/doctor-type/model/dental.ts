/**
 * Whether a doctor type is the dental specialty — the one that works on
 * teeth, so the one a treatment form shows a tooth chart for.
 *
 * By name, because a name is all a doctor or a treatment type carries (both
 * list serializers render the FK through `__str__`). Clinics type it
 * themselves and spelling varies — the live clinic has "Stamatolog" — so this
 * matches the Latin spellings and the Cyrillic one, not one exact string.
 */
const DENTAL_NAME = /^(stomatolog|stamatolog|стоматолог)/i

export function isDentalDoctorType(name: string | null): boolean {
  return name !== null && DENTAL_NAME.test(name.trim())
}
