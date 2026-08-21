import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { Can, fullName, sessionQueries, useSession } from '@/entities/session'
import { useLogout } from '@/features/auth-logout'
import { ApiError } from '@/shared/api/errors'
import {
  AppShell,
  Avatar,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

    if (session.clinics.length === 0) {
      throw redirect({ to: '/onboarding' })
    }

    return { session, clinicId: session.activeClinicId }
  },

  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const navigate = useNavigate()
  const session = useSession()
  const { mutate: logout, isPending } = useLogout()

  const handleLogout = () => {
    logout(undefined, {
      onSettled: () => navigate({ to: '/login' }),
    })
  }

  return (
    <AppShell
      brand={<span className="text-title2 text-text">SalomatOS</span>}
      headerActions={
        session ? (
          <DropdownMenu
            trigger={
              <button aria-label={fullName(session)} className="rounded-full" type="button">
                <Avatar name={fullName(session)} />
              </button>
            }
          >
            <DropdownMenuLabel>{session.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isPending}
              iconLeft={<LogOut aria-hidden="true" className="size-4" />}
              onSelect={handleLogout}
            >
              Chiqish
            </DropdownMenuItem>
          </DropdownMenu>
        ) : null
      }
      labels={{
        skipToContent: "Asosiy qismga o'tish",
        openNavigation: 'Menyuni ochish',
        navigation: 'Asosiy menyu',
      }}
      sidebar={
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              className="block rounded-control px-3 py-2 text-body text-text-secondary hover:bg-sunken hover:text-text"
              to="/dashboard"
            >
              Boshqaruv paneli
            </Link>
          </li>
          {/* Nothing here is a permission check that matters — Django's is. */}
          <Can permission="patient:read">
            <li>
              <span className="block px-3 py-2 text-body text-text-tertiary">
                Bemorlar (Faza 6)
              </span>
            </li>
          </Can>
          <Can permission="billing:read">
            <li>
              <span className="block px-3 py-2 text-body text-text-tertiary">
                To&apos;lovlar (Faza 7)
              </span>
            </li>
          </Can>
        </ul>
      }
    >
      <Outlet />
    </AppShell>
  )
}
