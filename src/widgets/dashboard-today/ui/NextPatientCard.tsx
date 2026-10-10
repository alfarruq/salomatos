import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { Appointment } from '@/entities/appointment'
import { PatientAvatar } from '@/entities/patient'
import { cn } from '@/shared/lib/cn'

/**
 * The one appointment the desk should be preparing for, pulled out of the
 * queue so a phone shows it without scrolling. The queue below still lists
 * it too: this is a shortcut, not a second source of truth.
 */
export function NextPatientCard({ appointment }: { appointment: Appointment }) {
  const { t } = useTranslation('dashboard')
  const detail = [appointment.treatmentTypeName, appointment.doctorName]
    .filter((value): value is string => value !== null)
    .join(' · ')

  return (
    <section
      aria-label={t('next.label')}
      className="flex flex-col gap-3 rounded-card bg-accent p-4 text-on-accent"
    >
      <span className="text-callout tabular-nums">
        {t('next.label')} · {appointment.time}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <PatientAvatar name={appointment.fullName} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-title2">{appointment.fullName}</span>
          {detail === '' ? null : <span className="truncate text-callout">{detail}</span>}
        </div>
      </div>
      {appointment.patientId === null ? null : (
        <Link
          className={cn(
            'flex min-h-11 items-center justify-center rounded-control bg-surface',
            'text-body font-medium text-accent-text',
            'outline-none focus-visible:ring-2 focus-visible:ring-on-accent',
          )}
          params={{ patientId: String(appointment.patientId) }}
          to="/patients/$patientId"
        >
          {t('next.openCard')}
        </Link>
      )}
    </section>
  )
}
