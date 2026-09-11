import { useTranslation } from 'react-i18next'
import { Alert, Card } from '@/shared/ui'
import type { Clinic } from '../model/types'
import { WEEKDAYS } from '../model/types'

export interface ClinicSummaryCardProps {
  clinic: Clinic
}

/**
 * A read-only view of the clinic's profile.
 *
 * There is no edit dialog to open from here. `PATCH /clinic/<id>/` exists on
 * the server, but neither the list nor the create response carries an `id`
 * (see `entities/clinic/model/schema.ts`), so this client has nothing to put
 * in that URL. The note below says so plainly rather than hiding a dead end
 * behind a button that would 404.
 */
export function ClinicSummaryCard({ clinic }: ClinicSummaryCardProps) {
  const { t } = useTranslation(['admin', 'common'])

  return (
    <Card className="flex max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-title2 text-text">{clinic.name}</h2>
        <p className="text-callout text-text-secondary">{clinic.phoneNumber}</p>
        <p className="text-callout text-text-secondary">{clinic.address}</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-body text-text">{t('admin:clinic.hours')}</span>
        <ul className="flex flex-col gap-1">
          {WEEKDAYS.map((day) => {
            const schedule = clinic.workingHours[day]
            return (
              <li className="flex justify-between text-body text-text-secondary" key={day}>
                <span>{t(`common:weekday.${day}`)}</span>
                <span>
                  {schedule === null || schedule === undefined
                    ? t('admin:clinic.closed')
                    : `${schedule.open}–${schedule.close}`}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <Alert title={t('admin:clinic.editUnavailable')} tone="info" />
    </Card>
  )
}
