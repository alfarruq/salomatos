import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'

/**
 * The sections of the admin area, in one list.
 *
 * Adding one means adding a route file and an entry here — the navigation, the
 * ordering and the active state all read from this. Kept deliberately small so
 * that it stays the only place a section is declared.
 */
const SECTIONS = [
  { to: '/admin/doctors', labelKey: 'admin:nav.doctors' },
  { to: '/admin/doctor-types', labelKey: 'admin:nav.doctorTypes' },
  { to: '/admin/services', labelKey: 'admin:nav.services' },
  { to: '/admin/clinic', labelKey: 'admin:nav.clinic' },
] as const

/**
 * Clinic administration, for the clinic account only.
 *
 * ⚠️ UX, not security (§9.1) — and on this backend not even a reflection of
 * it: `DEFAULT_PERMISSION_CLASSES` is `IsAuthenticated` alone, so the server
 * lets any signed-in account call these endpoints. What actually limits the
 * damage is that every list is filtered by `clinic=request.user`, which for a
 * doctor's own token returns nothing. Closing it properly is server-side.
 */
export const Route = createFileRoute('/_auth/admin')({
  beforeLoad: ({ context }) => {
    /*
     * `clinic:manage` belongs to `superadmin` alone (ADR-012). A doctor or a
     * receptionist reaching this URL is sent back to the dashboard rather than
     * shown an empty shell they cannot use.
     */
    if (!context.session.permissions.has('clinic:manage')) {
      throw redirect({ to: '/dashboard' })
    }
  },

  component: AdminLayout,
})

function AdminLayout() {
  const { t } = useTranslation(['admin', 'common'])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-title1 text-text">{t('admin:title')}</h1>
        <p className="text-callout text-text-secondary">{t('admin:subtitle')}</p>
      </div>

      {/*
       * A nav rather than a tab list: each section is its own route, so the
       * back button works and a link to one can be sent to somebody (§7.3).
       */}
      <nav aria-label={t('admin:title')}>
        <ul className="flex flex-wrap gap-1 border-b border-border">
          {SECTIONS.map((section) => (
            <li key={section.to}>
              <Link
                activeProps={{ 'data-active': 'true' }}
                className={cn(
                  'block rounded-t-control px-4 py-2 text-body text-text-secondary',
                  'border-b-2 border-transparent transition-colors duration-150 ease-out-apple',
                  'hover:text-text data-[active=true]:border-accent data-[active=true]:text-text',
                )}
                to={section.to}
              >
                {t(section.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet />
    </div>
  )
}
