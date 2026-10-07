import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type Appointment,
  type AppointmentFormInput,
  type AppointmentId,
  appointmentKeys,
  appointmentSchema,
  toAppointment,
  toAppointmentPayload,
} from '@/entities/appointment'
import { httpClient } from '@/shared/api/httpClient'

async function updateAppointment({
  appointmentId,
  input,
  includePatientId,
  includeDoctorId,
}: {
  appointmentId: AppointmentId
  input: AppointmentFormInput
  /**
   * `false` unless the dialog reports the field itself was changed this
   * session (`formState.dirtyFields`) — same guard as `useUpdateDoctor`, so a
   * PATCH only ever touches the link the person actually edited.
   */
  includePatientId: boolean
  includeDoctorId: boolean
}): Promise<Appointment> {
  const payload = toAppointmentPayload(input)
  if (!includePatientId) delete payload['patient']
  if (!includeDoctorId) delete payload['doctor']

  const raw = await httpClient<unknown>(`v1/calendars/appointments/${appointmentId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return toAppointment(v.parse(appointmentSchema, raw))
}

/** ⛔ No optimistic update (§6.5): a rejected edit must not show the wrong slot as saved. */
export function useUpdateAppointment(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateAppointment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.scope(clinicId) })
    },
  })
}
