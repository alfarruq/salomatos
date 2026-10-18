import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { CalendarDays, House, LogOut, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Can, sessionQueries, useSession } from '@/entities/session'
import { useLogout } from '@/features/auth-logout'
import { LanguageSwitcher } from '@/features/language-switch'
import { LockScreen, useIdleLock, useLockStore } from '@/features/session-lock'
import { clearSession } from '@/shared/api/authSession'
import { ApiError } from '@/shared/api/errors'
import {
  AppShell,
  Avatar,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Logo,
  tabBarItemClassName,
} from '@/shared/ui'

/**
 * The authentication guard, in one place (§8.2). Repeating it per page is how a
 * screen eventually ships without it.
 *
 * ⚠️ This is UX, not security (§9.1). It stops an unauthenticated user seeing an
 * empty shell; what actually protects the data is Django refusing the request.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    // `ensureQueryData` reads the cache when it is fresh, so navigating between
    // pages does not re-ask the server who you are.
    const session = await context.queryClient
      .ensureQueryData(sessionQueries.me())
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.kind === 'unauthorized') {
          throw redirect({ to: '/login', search: { redirect: location.href } })
        }
        // A network or server fault is not "signed out" — let the boundary
        // show it rather than bouncing the user to a login form that will
        // also fail.
        throw error
      })

    /*
     * 🔴 This application is for clinic staff. Patients reach their own
     * records through the Telegram bot (`/api/telegram/*`) and have no account
     * here at all — there is no patient portal, by product decision.
     *
     * The check matters because patients are rows in the same `User` table and
     * authenticate against the same endpoint, so one with a password set can
     * sign in. What they would get is an empty shell they could still type
     * `/patients` into. The server returns nothing for them — every queryset
     * filters by `clinic=request.user` — so this closes a door rather than
     * plugging a leak, but a door that opens onto staff software is not one to
     * leave ajar.
     *
     * Both the token and the cache go before the redirect: `/login` decides
     * whether to show its form by asking whether a session exists, so leaving
     * one cached would bounce the user straight back here.
     */
    if (session.role === 'patient') {
      clearSession()
      context.queryClient.clear()
      throw redirect({ to: '/login', search: { denied: 'patient' } })
    }

    /*
     * The tenant every child route scopes its queries by (§6.2). Never null:
     * it is the authenticated user's own id, read from the token, so a
     * resolved session always has one — which is what lets the patient routes
     * take a plain `number` instead of guarding a nullable id on every screen.
     */
    return { session, clinicId: session.clinicId }
  },

  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const session = useSession()
  const { mutate: logout, isPending } = useLogout()

  const isLocked = useLockStore((state) => state.isLocked)
  useIdleLock(session)

  const handleLogout = () => {
    logout(undefined, {
      onSettled: () => navigate({ to: '/login' }),
    })
  }

  /*
   * §13.4 — returned before the shell, not layered over it. By this point the
   * cache is already empty, so there is nothing underneath worth hiding; not
   * rendering the app at all also keeps its keyboard traps out of the way.
   */
  if (isLocked) {
    return (
      <LockScreen
        onSignOut={() => {
          useLockStore.getState().unlock()
          handleLogout()
        }}
      />
    )
  }

  return (
    <AppShell
      brand={<Logo compactBelowLg />}
      headerActions={
        session ? (
          <>
            <LanguageSwitcher />
            <DropdownMenu
              trigger={
                <button aria-label={session.fullName} className="rounded-full" type="button">
                  <Avatar name={session.fullName} />
                </button>
              }
            >
              <DropdownMenuLabel>{session.email ?? session.fullName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isPending}
                iconLeft={<LogOut aria-hidden="true" className="size-4" />}
                onSelect={handleLogout}
              >
                {t('action.signOut')}
              </DropdownMenuItem>
            </DropdownMenu>
          </>
        ) : null
      }
      labels={{
        skipToContent: t('nav.skipToContent'),
        openNavigation: t('nav.openNavigation'),
        navigation: t('nav.navigation'),
        more: t('nav.more'),
      }}
      tabBar={
        <>
          <Link
            activeProps={{ 'data-active': 'true' }}
            className={tabBarItemClassName}
            to="/dashboard"
          >
            <House aria-hidden="true" className="size-6" />
            {t('nav.dashboard')}
          </Link>
          <Can permission="patient:read">
            <Link
              activeProps={{ 'data-active': 'true' }}
              className={tabBarItemClassName}
              to="/patients"
            >
              <Users aria-hidden="true" className="size-6" />
              {t('nav.patients')}
            </Link>
          </Can>
          <Can permission="appointment:read">
            <Link
              activeProps={{ 'data-active': 'true' }}
              className={tabBarItemClassName}
              to="/appointments"
            >
              <CalendarDays aria-hidden="true" className="size-6" />
              {t('nav.appointments')}
            </Link>
          </Can>
        </>
      }
      sidebar={
        <ul className="flex flex-col gap-1">
          <li>
            <Link {...sidebarLinkProps} to="/dashboard">
              {t('nav.dashboard')}
            </Link>
          </li>
          {/* Nothing here is a permission check that matters — Django's is. */}
          <Can permission="patient:read">
            <li>
              <Link {...sidebarLinkProps} to="/patients">
                {t('nav.patients')}
              </Link>
            </li>
          </Can>
          {/* Treatments are medical records — doctors and the desk both read them. */}
          <Can permission="medical-record:read">
            <li>
              <Link {...sidebarLinkProps} to="/treatments">
                {t('nav.treatments')}
              </Link>
            </li>
          </Can>
          <Can permission="appointment:read">
            <li>
              <Link {...sidebarLinkProps} to="/appointments">
                {t('nav.appointments')}
              </Link>
            </li>
          </Can>
          <Can permission="billing:read">
            <li>
              <span className="block px-3 py-2 text-body text-text-tertiary">
                {t('nav.billing')}
              </span>
            </li>
          </Can>
          {/* `clinic:manage` is the clinic account alone (ADR-012). */}
          <Can permission="clinic:manage">
            <li>
              <Link {...sidebarLinkProps} to="/manage">
                {t('nav.admin')}
              </Link>
            </li>
          </Can>
        </ul>
      }
    >
      <Outlet />
    </AppShell>
  )
}

/**
 * Fuzzy matching (the router's default) keeps a section lit on its nested
 * pages too, e.g. `/manage/doctors` under `/manage`.
 */
const sidebarLinkProps = {
  className:
    'block rounded-control px-3 py-2 text-body transition-colors duration-150 ease-out-apple',
  activeProps: { className: 'bg-accent-soft font-medium text-accent-text' },
  inactiveProps: { className: 'text-text-secondary hover:bg-sunken hover:text-text' },
} as const
