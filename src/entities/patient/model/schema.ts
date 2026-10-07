import * as v from 'valibot'
import { pageSchema } from '@/shared/api/pagination'
import { parseCalendarDate } from '@/shared/lib/calendarDate'
import type {
  AppointmentSlot,
  Patient,
  PatientGalleryImage,
  PatientListItem,
  PatientTreatment,
} from './types'

/**
 * The wire contract for `/api/patients/`, validated at runtime (ADR-006).
 *
 * Only the fields the interface uses are declared; Valibot ignores the rest.
 * The detail response's `recipe` array still passes through untouched — the
 * prescriptions tab reads its own endpoint (`entities/recipe`) instead, since
 * `/api/v1/core/recipes/` is the confirmed contract and this embedded one is
 * not.
 */

/** Absent or null both mean "nothing here" — see `sessionSchema` for why. */
const optionalString = v.optional(v.nullable(v.string()), null)

/**
 * A number the server may send as a string.
 *
 * Every figure on a patient row — `remaining`, `total_remaining`, `age`,
 * `visit_number` — is a `SerializerMethodField`, and drf-yasg types all of
 * them `string` because it cannot see what the method returns. The Python
 * returns integers. One of the two is wrong and the schema cannot say which,
 * so the client accepts both rather than betting the patient table on the
 * guess: getting it wrong means the list does not render at all.
 *
 * Anything that is not a finite number after coercion becomes null, which the
 * table renders as a dash. A blank cell is a better failure than a blank page.
 */
const optionalNumber = v.pipe(
  v.optional(v.nullable(v.union([v.number(), v.string()])), null),
  v.transform((value) => {
    if (value === null || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }),
)

/**
 * Treatment state.
 *
 * Unknown values are dropped rather than rejected. `Treatment.Status` is a
 * `TextChoices` with two members today, but a third would be a migration on
 * the server and a table of patients is not worth refusing to render over a
 * badge this client does not recognise.
 */
const statusSchema = v.optional(
  v.fallback(v.nullable(v.picklist(['in_progress', 'completed'])), null),
  null,
)

export const patientListItemSchema = v.object({
  /*
   * The two the row cannot exist without: one identifies the record, the
   * other is what a receptionist reads. Everything else may be missing.
   */
  id: v.pipe(v.number(), v.integer()),
  full_name: v.string(),

  phone_number: optionalString,
  birth_date: optionalString,
  address: optionalString,
  office: optionalString,
  doctor: optionalString,
  status: statusSchema,
  treatment_type: optionalString,
  appointment_date: optionalString,
  remaining: optionalNumber,
  total_remaining: optionalNumber,
})

export const patientPageSchema = pageSchema(patientListItemSchema)

const treatmentSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  name: v.string(),
  tooth_number: optionalNumber,
})

/**
 * `GalleryList` (drf-yasg). `image` is `readOnly` and typed `uri`, but every
 * other media field on this backend (`patient.image`, `doctor.image`) turns
 * out to be a relative `/media/...` path rather than an absolute URL — so it
 * is read the same defensive way, not trusted to be a real URI.
 */
export const galleryImageSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  image: optionalString,
  created_at: optionalString,
})

export const patientDetailSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  full_name: v.string(),

  phone_number: optionalString,
  birth_date: optionalString,
  address: optionalString,
  office: optionalString,
  doctor: optionalString,
  image: optionalString,
  age: optionalNumber,
  status: statusSchema,
  /*
   * `get_treatment_type` builds a list of objects. drf-yasg reports it as a
   * plain string because it cannot infer a SerializerMethodField's return
   * type — the Python is the better source here, and the fallback covers the
   * case where it is right and this is wrong.
   */
  treatment_type: v.optional(v.fallback(v.array(treatmentSchema), []), []),
  gallery: v.optional(v.fallback(v.array(galleryImageSchema), []), []),

  // Money, and the counters beside it. Zero is the server's own default when
  // a patient has no treatment on record.
  total_treatment_cost: optionalNumber,
  total_paid: optionalNumber,
  remaining: optionalNumber,
  total_remaining: optionalNumber,
  visit_number: optionalNumber,
})

export type PatientListItemResponse = v.InferOutput<typeof patientListItemSchema>
export type PatientDetailResponse = v.InferOutput<typeof patientDetailSchema>

/** `dd.MM.yyyy HH:mm`, which is what `get_appointment_date` formats. */
const FORMATTED_APPOINTMENT = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/

/**
 * Recovers date parts from the string the serializer already formatted.
 *
 * `PatientListSerializer.get_appointment_date` returns `"24.08.2026 14:30"`
 * rather than a machine-readable value, so the day and the hour arrive already
 * committed to one presentation. Rendering that verbatim would put a
 * `dd.MM.yyyy` date in front of an English or Russian interface, which §12.4
 * exists to prevent — so the parts are recovered and left for the UI to format.
 *
 * Returns null when the shape is anything else, including a real date that
 * does not exist (`31.02.2026`), rather than guessing. The caller shows
 * nothing, which is honest: the value is a convenience field, and the
 * appointments endpoint sends a proper `date` and `time` when it matters.
 */
export function parseFormattedAppointment(value: string | null): AppointmentSlot | null {
  if (value === null) return null

  const match = FORMATTED_APPOINTMENT.exec(value)
  if (match === null) return null

  const [, day, month, year, hour, minute] = match
  const date = `${year}-${month}-${day}`

  if (parseCalendarDate(date) === null) return null
  if (Number(hour) > 23 || Number(minute) > 59) return null

  return { date, time: `${hour}:${minute}` }
}

/** `null` for anything the backend sent that is not a real calendar date. */
function toCalendarDateOrNull(value: string | null): string | null {
  if (value === null) return null
  return parseCalendarDate(value) === null ? null : value
}

export function toPatientListItem(response: PatientListItemResponse): PatientListItem {
  return {
    id: response.id,
    fullName: response.full_name,
    phoneNumber: response.phone_number,
    birthDate: toCalendarDateOrNull(response.birth_date),
    address: response.address,
    office: response.office,
    doctorName: response.doctor,
    status: response.status,
    treatmentType: response.treatment_type,
    lastAppointment: parseFormattedAppointment(response.appointment_date),
    remaining: response.remaining,
    totalRemaining: response.total_remaining ?? 0,
  }
}

function toTreatment(response: v.InferOutput<typeof treatmentSchema>): PatientTreatment {
  return { id: response.id, name: response.name, toothNumber: response.tooth_number }
}

export function toGalleryImage(
  response: v.InferOutput<typeof galleryImageSchema>,
): PatientGalleryImage {
  return { id: response.id, imageUrl: response.image, createdAt: response.created_at }
}

export function toPatient(response: PatientDetailResponse): Patient {
  return {
    id: response.id,
    fullName: response.full_name,
    phoneNumber: response.phone_number,
    birthDate: toCalendarDateOrNull(response.birth_date),
    address: response.address,
    office: response.office,
    doctorName: response.doctor,
    imageUrl: response.image,
    age: response.age,
    status: response.status,
    treatments: response.treatment_type.map(toTreatment),
    gallery: response.gallery.map(toGalleryImage),
    // Zero, not null: these are counters and the server's own default is 0
    // when a patient has no treatment on record.
    totalTreatmentCost: response.total_treatment_cost ?? 0,
    totalPaid: response.total_paid ?? 0,
    remaining: response.remaining ?? 0,
    totalRemaining: response.total_remaining ?? 0,
    visitNumber: response.visit_number ?? 0,
  }
}
