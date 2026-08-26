import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type Doctor,
  type DoctorFormInput,
  type DoctorId,
  doctorKeys,
  doctorSchema,
  toDoctor,
  toDoctorPayload,
} from '@/entities/doctor'
import { httpClient } from '@/shared/api/httpClient'

/**
 * ⚠️ `update_doctor` calls `get_doctor(user_id)` without a tenant argument, so
 * the server will happily edit a doctor belonging to another clinic if given
 * their id. Nothing the client can fix — it is item 3 in the backend review —
 * and worth knowing before this screen is trusted as a boundary.
 */
async function updateDoctor({
  doctorId,
  input,
}: {
  doctorId: DoctorId
  input: DoctorFormInput
}): Promise<Doctor> {
  const raw = await httpClient<unknown>(`v1/clinic/doctors/${doctorId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toDoctorPayload(input)),
  })

  return toDoctor(v.parse(doctorSchema, raw))
}

/** ⛔ No optimistic update (§6.5): a rejected edit would leave the wrong name on screen. */
export function useUpdateDoctor(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDoctor,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: doctorKeys.scope(clinicId) })
    },
  })
}
