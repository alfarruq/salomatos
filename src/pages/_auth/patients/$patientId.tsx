import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Patient } from '@/entities/patient'
import { PatientAvatar, PatientStatusBadge, patientQueries } from '@/entities/patient'
import { Can } from '@/entities/session'
import { EditPatientDialog } from '@/features/patient-edit'
import { formatCalendarDate } from '@/shared/lib/calendarDate'
import { formatSom } from '@/shared/lib/money'
import { Button, Card, ErrorState, QueryBoundary, Skeleton } from '@/shared/ui'

export const Route = createFileRoute('/_auth/patients/$patientId')({
  component: PatientDetailPage,
})

function PatientDetailPage() {
  const { t } = useTranslation(['patients', 'common'])
  const { patientId } = Route.useParams()
  const { clinicId } = Route.useRouteContext()
  const [isEditOpen, setEditOpen] = useState(false)

  /*
   * ADR-013: ids are integers here. A non-numeric path segment is a typed or
   * tampered URL, not a patient — asking the server about `NaN` would answer
   * 404 anyway, one round trip later.
   */
  const id = Number(patientId)
  const query = useQuery({ ...patientQueries.detail(clinicId, id), enabled: Number.isInteger(id) })

  if (!Number.isInteger(id)) {
    return (
      <ErrorState
        description={t('patients:detail.notFoundBody')}
        headingLevel={1}
        title={t('patients:detail.notFound')}
      />
    )
  }

  return (
    <QueryBoundary
      error={({ retry }) => (
        <ErrorState
          description={t('common:error.pageBody')}
          headingLevel={1}
          retryLabel={t('common:action.retry')}
          title={t('common:error.pageTitle')}
          // Spread rather than passed: under `exactOptionalPropertyTypes` an
          // absent prop and one set to undefined are different types, and
          // `ErrorState` hides the retry button when the handler is absent.
          {...(retry === undefined ? {} : { onRetry: retry })}
        />
      )}
      loading={<PatientDetailSkeleton />}
      query={query}
    >
      {(patient) => (
        <div className="flex flex-col gap-6">
          <Link className="text-callout text-accent-text hover:underline" to="/patients">
            {t('patients:detail.backToList')}
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            <PatientAvatar imageUrl={patient.imageUrl} name={patient.fullName} size="lg" />
            <div className="flex flex-col gap-1">
              <h1 className="text-title1 text-text">{patient.fullName}</h1>
              <PatientStatusBadge status={patient.status} />
            </div>

            <div className="ms-auto">
              {/* UX only — Django decides what may actually be written (§9.1). */}
              <Can permission="patient:write">
                <Button onClick={() => setEditOpen(true)} size="sm" variant="secondary">
                  {t('patients:edit.title')}
                </Button>
              </Can>
            </div>
          </div>

          <PatientFacts patient={patient} />
          <PatientBalance patient={patient} />

          <EditPatientDialog
            clinicId={clinicId}
            onOpenChange={setEditOpen}
            open={isEditOpen}
            patient={patient}
          />
        </div>
      )}
    </QueryBoundary>
  )
}

function PatientFacts({ patient }: { patient: Patient }) {
  const { t, i18n } = useTranslation('patients')

  const birthDate =
    patient.birthDate === null ? null : formatCalendarDate(patient.birthDate, i18n.language)

  return (
    <Card className="grid gap-4 p-6 sm:grid-cols-2">
      <Fact label={t('form.phoneNumber')} value={patient.phoneNumber} />
      <Fact
        label={t('form.birthDate')}
        // The age comes from the server unchanged, wrong as it is — see the
        // note on `Patient.age`.
        value={
          birthDate === null
            ? null
            : patient.age === null
              ? birthDate
              : t('detail.birthDateWithAge', { age: patient.age, date: birthDate })
        }
      />
      <Fact label={t('column.doctor')} value={patient.doctorName} />
      <Fact label={t('form.address')} value={patient.address} />
      <Fact label={t('form.office')} value={patient.office} />
      <Fact label={t('detail.visitNumber')} value={String(patient.visitNumber)} />
    </Card>
  )
}

function PatientBalance({ patient }: { patient: Patient }) {
  const { t, i18n } = useTranslation('patients')
  const locale = i18n.language

  return (
    <Card className="grid gap-4 p-6 sm:grid-cols-3">
      <Fact label={t('detail.totalCost')} value={formatSom(patient.totalTreatmentCost, locale)} />
      <Fact label={t('detail.totalPaid')} value={formatSom(patient.totalPaid, locale)} />
      <Fact label={t('column.remaining')} value={formatSom(patient.totalRemaining, locale)} />

      {patient.treatments.length === 0 ? null : (
        <div className="flex flex-col gap-1 sm:col-span-3">
          <span className="text-caption text-text-tertiary">{t('detail.treatments')}</span>
          <ul className="flex flex-wrap gap-2">
            {patient.treatments.map((treatment) => (
              <li className="text-body text-text" key={treatment.id}>
                {treatment.toothNumber === null
                  ? treatment.name
                  : t('detail.treatmentWithTooth', {
                      name: treatment.name,
                      tooth: treatment.toothNumber,
                    })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-text-tertiary">{label}</span>
      <span className="text-body text-text">{value ?? '—'}</span>
    </div>
  )
}

function PatientDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-6 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
