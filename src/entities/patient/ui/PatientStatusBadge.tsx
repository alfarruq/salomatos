import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '@/shared/ui'
import type { PatientStatus } from '../model/types'

export interface PatientStatusBadgeProps {
  /** Null when the patient has no treatment on record yet. */
  status: PatientStatus | null
}

/**
 * Shows treatment state. Passive by design — an entity renders, it does not act
 * (§3.2); changing a status belongs to a feature.
 */
const tones: Record<PatientStatus, BadgeTone> = {
  // Not `warning`: an in-progress treatment is the normal state of most
  // patients in a clinic, and colouring the common case as a caution trains
  // staff to ignore the colour.
  in_progress: 'accent',
  completed: 'success',
}

export function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  const { t } = useTranslation('patients')

  if (status === null) {
    return <Badge tone="neutral">{t('status.none')}</Badge>
  }

  return <Badge tone={tones[status]}>{t(`status.${status}`)}</Badge>
}
