import { createFileRoute } from '@tanstack/react-router'
import { DoctorTypeTable } from '@/widgets/doctor-type-table'

export const Route = createFileRoute('/_auth/admin/doctor-types')({
  component: DoctorTypesSection,
})

function DoctorTypesSection() {
  const { clinicId } = Route.useRouteContext()

  return <DoctorTypeTable clinicId={clinicId} />
}
