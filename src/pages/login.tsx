import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { sessionQueries } from '@/entities/session'
import { LoginForm } from '@/features/auth-login'
import { Card } from '@/shared/ui'

const searchSchema = z.object({
  /**
   * Where to go back to after signing in.
   *
   * ⛔ Validated as an app-relative path on purpose. Accepting an arbitrary URL
   * here is an open redirect: a link to /login?redirect=https://evil.example
   * would send a receptionist somewhere else immediately after they typed
   * their password.
   */
  redirect: z
    .string()
    .regex(/^\/(?!\/)/, 'must be an app-relative path')
    .optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,

  beforeLoad: async ({ context }) => {
    // Already signed in? Do not show a login form.
    const session = await context.queryClient.ensureQueryData(sessionQueries.me()).catch(() => null)
    if (session !== null) {
      throw redirect({ to: '/dashboard' })
    }

    /*
     * Nobody is signed in, and this is where an expired session lands. Drop
     * anything the previous user could see — §13.4, and the reception desk is
     * shared. Safe to do here: the request above has already settled, so
     * nothing gets cancelled.
     */
    context.queryClient.clear()
  },

  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-title1 text-text">SalomatOS</h1>
          <p className="text-callout text-text-secondary">Davom etish uchun tizimga kiring.</p>
        </div>

        <LoginForm
          onSuccess={() => {
            navigate({ to: search.redirect ?? '/dashboard' })
          }}
        />
      </Card>
    </main>
  )
}
