import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type Clinic,
  type ClinicFormInput,
  clinicKeys,
  clinicSchema,
  toClinic,
  toClinicPayload,
} from '@/entities/clinic'
import { httpClient } from '@/shared/api/httpClient'

async function createClinic(input: ClinicFormInput): Promise<Clinic> {
  const raw = await httpClient<unknown>('v1/clinic/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toClinicPayload(input)),
  })

  // The server sets `admin` itself and answers with the list serializer,
  // which — like the list — carries no id (see `entities/clinic`).
  return toClinic(v.parse(clinicSchema, raw))
}

/** ⛔ No optimistic update (§6.5): nothing to show until the server confirms it exists. */
export function useCreateClinic(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClinic,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clinicKeys.scope(clinicId) })
    },
  })
}
