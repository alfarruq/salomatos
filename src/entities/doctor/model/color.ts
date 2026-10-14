import type { DoctorId } from './types'

export interface DoctorColor {
  /** Left-edge stripe on a card. */
  stripe: string
  /** Small dot next to the doctor's name. */
  dot: string
}

/**
 * Full class strings, not `bg-doctor-${n}`: Tailwind only generates classes it
 * can find verbatim in the source.
 */
const PALETTE: readonly DoctorColor[] = [
  { stripe: 'border-l-doctor-1', dot: 'bg-doctor-1' },
  { stripe: 'border-l-doctor-2', dot: 'bg-doctor-2' },
  { stripe: 'border-l-doctor-3', dot: 'bg-doctor-3' },
  { stripe: 'border-l-doctor-4', dot: 'bg-doctor-4' },
  { stripe: 'border-l-doctor-5', dot: 'bg-doctor-5' },
  { stripe: 'border-l-doctor-6', dot: 'bg-doctor-6' },
  { stripe: 'border-l-doctor-7', dot: 'bg-doctor-7' },
  { stripe: 'border-l-doctor-8', dot: 'bg-doctor-8' },
]

/** No doctor assigned: a neutral stripe, so the card still lines up with the rest. */
const UNASSIGNED: DoctorColor = { stripe: 'border-l-border-strong', dot: 'bg-border-strong' }

/**
 * Derived from the id so a doctor keeps the same colour on every screen and
 * every visit, with nothing stored. Past eight doctors colours repeat, which
 * is why the name is always shown beside them.
 */
export function doctorColorOf(doctorId: DoctorId | null): DoctorColor {
  if (doctorId === null) return UNASSIGNED
  return PALETTE[Math.abs(doctorId) % PALETTE.length] ?? UNASSIGNED
}
