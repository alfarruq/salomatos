import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { fullName, useSession } from '@/entities/session'
import { useSwitchClinic } from '@/features/clinic-switch'
import { Button, Card } from '@/shared/ui'

export const Route = createFileRoute('/_auth/dashboard')({
  component: DashboardPage,
})

/**
 * A placeholder until the real modules land in phases 6 and 7. It exists now so
 * the authenticated shell, the guard and clinic switching can be used and
 * tested end to end.
 */
function DashboardPage() {
  const { t } = useTranslation(['common', 'auth'])
  const session = useSession()
  const { mutate: switchClinic, isPending } = useSwitchClinic()

  if (session === undefined) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-title1 text-text">{t('common:nav.dashboard')}</h1>
        <p className="text-callout text-text-secondary">
          {fullName(session)} · {session.role}
        </p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-title2 text-text">{t('auth:clinic.heading')}</h2>
        <div className="flex flex-wrap gap-3">
          {session.clinics.map((clinic) => (
            <Button
              disabled={isPending}
              key={clinic.id}
              onClick={() => switchClinic(clinic.id)}
              variant={clinic.id === session.activeClinicId ? 'primary' : 'secondary'}
            >
              {clinic.name}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-title2 text-text">{t('auth:clinic.permissions')}</h2>
        <ul className="flex flex-wrap gap-2">
          {[...session.permissions].map((permission) => (
            <li className="text-caption text-text-secondary" key={permission}>
              {permission}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
