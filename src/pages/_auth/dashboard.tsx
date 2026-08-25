import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/entities/session'
import { Card } from '@/shared/ui'

export const Route = createFileRoute('/_auth/dashboard')({
  component: DashboardPage,
})

/**
 * A placeholder until the real modules land in phases 6 and 7. It exists now so
 * the authenticated shell and the guard can be used and tested end to end.
 *
 * The clinic switcher that used to sit here is gone: `User.clinic` is a single
 * foreign key on this backend and `/api/me/` returns no clinic list, so there
 * is nothing to switch between (see ADR-003, revised).
 */
function DashboardPage() {
  const { t } = useTranslation(['common', 'auth'])
  const session = useSession()

  if (session === undefined) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-title1 text-text">{t('common:nav.dashboard')}</h1>
        <p className="text-callout text-text-secondary">
          {session.fullName} · {session.role}
        </p>
      </div>

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
