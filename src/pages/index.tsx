import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * There is no public landing page (§1.3) — the product is the panel behind a
 * login. `/` hands straight over to the guard, which decides where the user
 * actually belongs.
 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})
