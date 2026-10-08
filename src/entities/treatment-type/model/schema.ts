import * as v from 'valibot'
import { pageSchema } from '@/shared/api/pagination'
import type { TreatmentType } from './types'

/**
 * The wire contract for `/clinic/treatment-types/` (ADR-006).
 *
 * ⚠️ Paginated, unlike what an earlier comment here claimed ("a plain array,
 * like doctors"). That was the same `swagger_auto_schema`-without-`many=True`
 * misreading that has been wrong before — a real response came back as
 * `{count, next, previous, results}`, DRF's ordinary `PageNumberPagination`
 * envelope (`shared/api/pagination.ts`), and a clinic with more than
 * `PAGE_SIZE` services was silently missing every row past the first page.
 * Whether `/clinic/doctors/` genuinely differs or carries the same untested
 * assumption is not established either way — nothing here touches that entity.
 */

/**
 * A price the server may send as a string.
 *
 * `TreatmentTypeListSerializer` declares `IntegerField`, so a number is
 * expected — but the same reading of a `SerializerMethodField` was wrong twice
 * already on the patient endpoints, and a price that fails to parse would
 * empty the whole services table rather than one cell.
 */
const priceSchema = v.pipe(
  v.optional(v.nullable(v.union([v.number(), v.string()])), null),
  v.transform((value) => {
    if (value === null || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }),
)

/** Absent or null both mean "nothing here" — see `doctor/model/schema.ts`. */
const optionalString = v.optional(v.nullable(v.string()), null)

export const treatmentTypeSchema = v.object({
  // A service without a name is not renderable; a service without a price is
  // ordinary — plenty are quoted per case.
  id: v.pipe(v.number(), v.integer()),
  name: v.string(),
  price: priceSchema,
  /*
   * A name, not an id — confirmed against a real response (`"Stamatolog"`),
   * the same shape `doctor_type` takes on `/clinic/doctors/` and for the same
   * reason: this is the list serializer's `__str__` of the foreign key, and
   * `createTreatmentType`'s own comment already noted create/update answer
   * with that same list serializer. A value from here can only be shown —
   * see `entities/doctor/model/types.ts` for why the create/edit select needs
   * the id from `entities/doctor-type` instead, never this field.
   */
  doctor_type: optionalString,
})

export const treatmentTypePageSchema = pageSchema(treatmentTypeSchema)

export type TreatmentTypeResponse = v.InferOutput<typeof treatmentTypeSchema>

export function toTreatmentType(response: TreatmentTypeResponse): TreatmentType {
  return {
    id: response.id,
    name: response.name,
    price: response.price,
    doctorTypeName: response.doctor_type,
  }
}
