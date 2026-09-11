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
 *
 * ⚠️ `specialty` was a plain text field until the server replaced it with a
 * `doctor_type` foreign key (`entities/doctor-type`). Neither
 * `DoctorListSerializer` nor `DoctorCreateUpdateSerializer` exposes that field
 * yet, so a doctor's type cannot be read or set through this endpoint — it
 * exists on the model but not on the wire. Nothing to show here until the
 * server catches up.
 */
export interface Doctor {
  id: DoctorId
  fullName: string
  phoneNumber: string | null
  email: string | null
}
