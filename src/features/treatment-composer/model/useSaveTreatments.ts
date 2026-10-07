import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import { patientKeys } from '@/entities/patient'
import { treatmentKeys, treatmentListSchema, treatmentSchema } from '@/entities/treatment'
import { httpClient } from '@/shared/api/httpClient'
import { toExistingTreatmentPayload, toNewTreatmentPayload } from './formSchema'
import type { ComposerFields, TreatmentRow } from './types'

export interface SaveTreatmentsInput {
  patientId: number
  rows: TreatmentRow[]
  fields: ComposerFields
  startDate: string
  visitNumber: number
  touched: { doctor: boolean; treatmentType: boolean }
}

async function saveTreatments(input: SaveTreatmentsInput): Promise<void> {
  const existingRow = input.rows.find((row) => row.existingTreatmentId !== null)
  const newRows = input.rows.filter((row) => row.existingTreatmentId === null)

  const requests: Promise<unknown>[] = []

  if (existingRow !== undefined && existingRow.existingTreatmentId !== null) {
    const payload = toExistingTreatmentPayload(existingRow, input.fields, input.touched)
    requests.push(
      httpClient<unknown>(`v1/clinic/treatments/${existingRow.existingTreatmentId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((raw) => v.parse(treatmentSchema, raw)),
    )
  }

  const newPayloads = newRows
    .map((row) =>
      toNewTreatmentPayload(row, input.fields, {
        patientId: input.patientId,
        startDate: input.startDate,
        visitNumber: input.visitNumber,
      }),
    )
    .filter((payload) => payload !== null)

  if (newPayloads.length > 0) {
    requests.push(
      httpClient<unknown>('v1/clinic/treatments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayloads),
      }).then((raw) => v.parse(treatmentListSchema, raw)),
    )
  }

  await Promise.all(requests)
}

/**
 * ⛔ No optimistic update (§6.5): this writes money and a tooth chart a
 * clinician relies on — showing a save the server then refused would mean
 * acting on a record that was never there.
 */
export function useSaveTreatments(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveTreatments,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treatmentKeys.scope(clinicId) })
      // The card's totals and tooth chart are derived from these rows server-side.
      void queryClient.invalidateQueries({ queryKey: patientKeys.scope(clinicId) })
    },
  })
}
