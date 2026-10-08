import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '@/shared/ui'
import type { AppointmentStatus } from '../model/types'

export interface AppointmentStatusBadgeProps {
  status: AppointmentStatus
}

/** Same tone mapping as `PatientStatusBadge` — the two share this enum. */
const tones: Record<AppointmentStatus, BadgeTone> = {
  in_progress: 'accent',
  completed: 'success',
}

/** Passive by design — an entity renders, it does not act (§3.2). */
export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  const { t } = useTranslation('appointments')

  return <Badge tone={tones[status]}>{t(`status.${status}`)}</Badge>
}
