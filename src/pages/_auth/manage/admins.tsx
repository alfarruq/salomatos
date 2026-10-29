import { createFileRoute } from '@tanstack/react-router'
import { AdministratorTable } from '@/widgets/administrator-table'

export const Route = createFileRoute('/_auth/manage/admins')({
  component: AdminsSection,
})

function AdminsSection() {
  // Set by the `_auth` guard, which resolved the session before this rendered.
  const { clinicId } = Route.useRouteContext()

  return <AdministratorTable clinicId={clinicId} />
}
