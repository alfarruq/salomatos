import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCan } from '@/entities/session'
import { cn } from '@/shared/lib/cn'

/** The finance tabs, in one list — the same shape as the admin area's sections. */
const TABS = [
  { to: '/finance', labelKey: 'finance:tabs.overview', exact: true },
  { to: '/finance/expenses', labelKey: 'finance:tabs.expenses', exact: false },
  { to: '/finance/recurring', labelKey: 'finance:tabs.recurring', exact: false },
  { to: '/finance/payroll', labelKey: 'finance:tabs.payroll', exact: false, isPayroll: true },
] as const

export const Route = createFileRoute('/_auth/finance')({
  beforeLoad: ({ context }) => {
    // The clinic's money is the owner's alone; the server refuses everyone else (§3).
    if (!context.session.permissions.has('reports:read')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: FinanceLayout,
})

function FinanceLayout() {
  const { t } = useTranslation('finance')
  const canManagePayroll = useCan('payroll:manage')
  const tabs = TABS.filter((tab) => !('isPayroll' in tab) || canManagePayroll)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title1 text-text">{t('title')}</h1>

      {/* A nav, not a tab list: each tab is its own route, so links and the back button work. */}
      <nav aria-label={t('title')}>
        <ul className="flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map((tab) => (
            <li className="shrink-0" key={tab.to}>
              <Link
                activeOptions={{ exact: tab.exact, includeSearch: false }}
                activeProps={{ 'data-active': 'true' }}
                className={cn(
                  'block rounded-t-control px-4 py-2 text-body whitespace-nowrap text-text-secondary',
                  'border-b-2 border-transparent transition-colors duration-150 ease-out-apple',
                  'hover:text-text data-[active=true]:border-accent data-[active=true]:text-text',
                )}
                to={tab.to}
              >
                {t(tab.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet />
    </div>
  )
}
