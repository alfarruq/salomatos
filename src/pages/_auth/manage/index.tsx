import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/manage` has no content of its own — it opens the first section.
 *
 * A redirect rather than a default component so the address bar always names
 * the section actually on screen, which is what makes it shareable.
 */
export const Route = createFileRoute('/_auth/manage/')({
  beforeLoad: () => {
    throw redirect({ to: '/manage/doctors' })
  },
})
