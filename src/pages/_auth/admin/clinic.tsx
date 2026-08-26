import { createFileRoute } from '@tanstack/react-router'
import { ClinicProfileForm } from '@/features/clinic-profile-edit'

export const Route = createFileRoute('/_auth/admin/clinic')({
  component: ClinicSection,
})

function ClinicSection() {
  // Resolved by the `_auth` guard before this rendered, so it is never absent.
  const { session } = Route.useRouteContext()

  return <ClinicProfileForm session={session} />
}
