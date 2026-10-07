import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '@/shared/ui'
import type { TreatmentStatus } from '../model/types'

export interface TreatmentStatusBadgeProps {
  status: TreatmentStatus | null
}

/**
 * Same values and same translation keys as `entities/patient`'s
 * `PatientStatusBadge` — `Treatment.Status` is the source both read — but
 * declared again rather than imported, since entities may not see one
 * another (§4).
 */
const tones: Record<TreatmentStatus, BadgeTone> = {
  in_progress: 'accent',
  completed: 'success',
}

export function TreatmentStatusBadge({ status }: TreatmentStatusBadgeProps) {
  const { t } = useTranslation('patients')

  if (status === null) {
    return <Badge tone="neutral">{t('status.none')}</Badge>
  }

  return <Badge tone={tones[status]}>{t(`status.${status}`)}</Badge>
}
