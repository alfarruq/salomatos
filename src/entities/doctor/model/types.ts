/** Integer, not a UUID — ADR-013. */
export type DoctorId = number

/**
 * A doctor, as the clinic administers them.
 *
 * On this backend a doctor is a `User` row with `role='doctor'` whose `clinic`
 * foreign key points at the clinic account. There is no separate staff model,
 * which is why creating one goes through `/clinic/doctors/` rather than
 * anything resembling an invitation flow: the server sets the role and the
 * clinic itself.
 */
export interface Doctor {
  id: DoctorId
  fullName: string
  specialty: string | null
  phoneNumber: string | null
  email: string | null
}
