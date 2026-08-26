import { createFileRoute } from '@tanstack/react-router'
import { DoctorTable } from '@/widgets/doctor-table'

export const Route = createFileRoute('/_auth/admin/doctors')({
  component: DoctorsSection,
})

function DoctorsSection() {
  // Set by the `_auth` guard, which resolved the session before this rendered.
  const { clinicId } = Route.useRouteContext()

  return <DoctorTable clinicId={clinicId} />
}
