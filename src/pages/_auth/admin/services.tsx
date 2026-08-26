import { createFileRoute } from '@tanstack/react-router'
import { TreatmentTypeTable } from '@/widgets/treatment-type-table'

export const Route = createFileRoute('/_auth/admin/services')({
  component: ServicesSection,
})

function ServicesSection() {
  const { clinicId } = Route.useRouteContext()

  return <TreatmentTypeTable clinicId={clinicId} />
}
