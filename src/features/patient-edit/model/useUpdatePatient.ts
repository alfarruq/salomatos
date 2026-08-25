import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type PatientFormInput,
  type PatientId,
  type PatientListItem,
  patientKeys,
  patientListItemSchema,
  toPatientListItem,
  toPatientPayload,
} from '@/entities/patient'
import { httpClient } from '@/shared/api/httpClient'

/**
 * ⚠️ **This endpoint is broken on the server as of 2026-08-25.**
 *
 * `PatientService.update_patient` calls `self.db.get_patient(user_id=...)` while
 * `PatientRepository.get_patient(self, user_id, user)` requires two arguments,
 * so every PATCH raises `TypeError` before it reaches the serializer. With
 * `DEBUG = True` the client receives Django's HTML traceback rather than the
 * error envelope, which `normalizeDrfError` turns into a plain `server` kind.
 *
 * The client side is written correctly and is covered against the mock, which
 * reproduces the contract as intended rather than as currently broken. It will
 * work unchanged once the missing argument is passed — a one-line fix, and the
 * same line that restores the tenant check that call was supposed to perform.
 */
async function updatePatient({
  patientId,
  input,
}: {
  patientId: PatientId
  input: PatientFormInput
}): Promise<PatientListItem> {
  const raw = await httpClient<unknown>(`patients/${patientId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPatientPayload(input)),
  })

  // As with create, the response is the *list* serializer.
  return toPatientListItem(v.parse(patientListItemSchema, raw))
}

/**
 * ⛔ No optimistic update. §6.5 permits them only for reversible actions, and a
 * patient's name and phone number are the fields staff use to identify the
 * right person — showing an edit that the server then refused would mean
 * looking at a record that says something nobody saved.
 */
export function useUpdatePatient(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updatePatient,

    onSuccess: (_patient, { patientId }) => {
      // The card, and every list the row could appear in.
      void queryClient.invalidateQueries({ queryKey: patientKeys.detail(clinicId, patientId) })
      void queryClient.invalidateQueries({ queryKey: patientKeys.scope(clinicId) })
    },
  })
}
