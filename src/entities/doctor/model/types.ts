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
 * `doctor_type` foreign key (`entities/doctor-type`). `DoctorListSerializer`
 * now reports it as `doctor_type = serializers.CharField()` with no `source` —
 * the FK's own `__str__`, i.e. its **name**, not its id. That is why this is
 * `doctorTypeName` rather than `doctorTypeId`: a value from here can be shown,
 * never fed back into the create/update select, which needs the id and gets
 * it from `entities/doctor-type` instead.
 */
export interface Doctor {
  id: DoctorId
  fullName: string
  phoneNumber: string | null
  email: string | null
  /** Null when no type is assigned — see `entities/doctor/model/schema.ts`. */
  doctorTypeName: string | null
}
