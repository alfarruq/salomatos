import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  galleryImageSchema,
  type PatientGalleryImage,
  type PatientId,
  patientKeys,
  toGalleryImage,
} from '@/entities/patient'
import { httpClient } from '@/shared/api/httpClient'

export interface UploadGalleryImageInput {
  patientId: PatientId
  file: File
}

/**
 * `POST /clinic/galleries/` (confirmed against the real backend — the only
 * accepted fields are `user`, which is the patient's own id despite the
 * name, and `image`, the file itself). Multipart, not JSON: no `Content-Type`
 * header here, so the browser sets the boundary itself.
 */
async function uploadGalleryImage({
  patientId,
  file,
}: UploadGalleryImageInput): Promise<PatientGalleryImage> {
  const body = new FormData()
  body.append('user', String(patientId))
  body.append('image', file)

  const raw = await httpClient<unknown>('v1/clinic/galleries/', { method: 'POST', body })
  return toGalleryImage(v.parse(galleryImageSchema, raw))
}

/**
 * ⛔ No optimistic update: the gallery is embedded in the patient detail
 * response, not its own list, so there is nowhere to insert a placeholder
 * without reaching into that cache entry's shape by hand.
 */
export function useUploadGalleryImage(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadGalleryImage,
    onSuccess: (_image, { patientId }) => {
      void queryClient.invalidateQueries({ queryKey: patientKeys.detail(clinicId, patientId) })
    },
  })
}
