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

async function updateDoctor({
  doctorId,
  input,
  includeDoctorType,
}: {
  doctorId: DoctorId
  input: DoctorFormInput
  /**
   * `toDoctorForm` cannot fill `doctorTypeId` from the server — the list
   * response has no such field, only create/update accept one — so the
   * select always opens unset regardless of what is actually assigned. Saving
   * that unconditionally would silently clear a real assignment nobody meant
   * to touch. `false` unless the dialog reports the select itself was
   * changed this session (`formState.dirtyFields.doctorTypeId`).
   */
  includeDoctorType: boolean
}): Promise<Doctor> {
  const payload = toDoctorPayload(input)
  if (!includeDoctorType) delete payload['doctor_type']

  const raw = await httpClient<unknown>(`v1/clinic/doctors/${doctorId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
