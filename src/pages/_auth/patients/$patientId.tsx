import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Briefcase,
  Cake,
  Calendar,
  CalendarPlus,
  MapPin,
  Pencil,
  Phone,
  Pill,
  Stethoscope,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Patient } from '@/entities/patient'
import {
  PatientAvatar,
  PatientGallery,
  PatientStatusBadge,
  patientQueries,
} from '@/entities/patient'
import { recipeQueries } from '@/entities/recipe'
import { Can } from '@/entities/session'
import type { Treatment } from '@/entities/treatment'
import { treatmentQueries } from '@/entities/treatment'
import { CreateAppointmentDialog } from '@/features/appointment-create'
import { DeletePatientDialog } from '@/features/patient-delete'
import { EditPatientDialog } from '@/features/patient-edit'
import { GalleryDropzone } from '@/features/patient-gallery-upload'
import { RecipeEditor } from '@/features/recipe-editor'
import { TreatmentComposer } from '@/features/treatment-composer'
import { DeleteTreatmentDialog } from '@/features/treatment-delete'
import { formatCalendarDate, todayCalendarDate } from '@/shared/lib/calendarDate'
import { cn } from '@/shared/lib/cn'
import { formatSom } from '@/shared/lib/money'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  formatSubscriber,
  QueryBoundary,
  Skeleton,
  subscriberDigitsOf,
  Tabs,
  toast,
} from '@/shared/ui'
import { PrescriptionCards } from '@/widgets/patient-prescriptions'
import { TreatmentHistoryTable, TreatmentToothChart } from '@/widgets/patient-treatments'

export const Route = createFileRoute('/_auth/patients/$patientId')({
  component: PatientDetailPage,
})

function PatientDetailPage() {
  const { t } = useTranslation(['patients', 'common'])
  const { patientId } = Route.useParams()
  const { clinicId } = Route.useRouteContext()
  const navigate = useNavigate()
  const [isEditOpen, setEditOpen] = useState(false)
  const [isDeleteOpen, setDeleteOpen] = useState(false)
  const [isAppointmentOpen, setAppointmentOpen] = useState(false)
  // Here rather than in the tabs: the header's button and the table both open it.
  const [isComposerOpen, setComposerOpen] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null)
  // A fresh key per opening: the form seeds its state once, on mount, so
  // without this the next opening would inherit the last one's doctor and rows.
  const [composerSession, setComposerSession] = useState(0)

  // Same reasoning as the composer: a fresh form on every opening.
  const [isRecipeEditorOpen, setRecipeEditorOpen] = useState(false)
  const [recipeEditorSession, setRecipeEditorSession] = useState(0)

  const openRecipeEditor = () => {
    setRecipeEditorSession((session) => session + 1)
    setRecipeEditorOpen(true)
  }

  const openComposer = (treatment: Treatment | null) => {
    setEditingTreatment(treatment)
    setComposerSession((session) => session + 1)
    setComposerOpen(true)
  }

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link className="text-callout text-accent-text hover:underline" to="/patients">
              {t('patients:detail.backToList')}
            </Link>

            <div className="flex flex-wrap gap-2">
              <Button
                className="max-md:hidden"
                iconLeft={<Stethoscope aria-hidden="true" className="size-4" />}
                onClick={() => openComposer(null)}
                size="sm"
                variant="primary"
              >
                {t('patients:detail.newTreatment')}
              </Button>
              <Button
                className="max-md:hidden"
                iconLeft={<Pill aria-hidden="true" className="size-4" />}
                onClick={openRecipeEditor}
                size="sm"
                variant="secondary"
              >
                {t('patients:detail.writePrescription')}
              </Button>
              <Button
                className="max-md:hidden"
                iconLeft={<CalendarPlus aria-hidden="true" className="size-4" />}
                onClick={() => setAppointmentOpen(true)}
                size="sm"
                variant="secondary"
              >
                {t('patients:detail.newAppointment')}
              </Button>
              {/* UX only — Django decides what may actually be written (§9.1). */}
              <Can permission="patient:write">
                <Button
                  iconLeft={<Pencil aria-hidden="true" className="size-4" />}
                  onClick={() => setEditOpen(true)}
                  size="sm"
                  variant="secondary"
                >
                  {t('patients:edit.title')}
                </Button>
                <Button
                  iconLeft={<Trash2 aria-hidden="true" className="size-4" />}
                  onClick={() => setDeleteOpen(true)}
                  size="sm"
                  variant="danger"
                >
                  {t('common:action.delete')}
                </Button>
              </Can>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <PatientSidebar
              onNewAppointment={() => setAppointmentOpen(true)}
              onNewTreatment={() => openComposer(null)}
              onWritePrescription={openRecipeEditor}
              patient={patient}
            />
            <PatientTabs
              onOpenComposer={openComposer}
              onOpenRecipeEditor={openRecipeEditor}
              patient={patient}
            />
          </div>

          <TreatmentComposer
            clinicId={clinicId}
            key={composerSession}
            nextVisitNumber={patient.visitNumber + 1}
            onOpenChange={setComposerOpen}
            open={isComposerOpen}
            patientId={patient.id}
            {...(editingTreatment === null ? {} : { initialTreatment: editingTreatment })}
          />

          <RecipeEditor
            clinicId={clinicId}
            key={`recipe-${recipeEditorSession}`}
            onOpenChange={setRecipeEditorOpen}
            open={isRecipeEditorOpen}
            patientId={patient.id}
            patientName={patient.fullName}
          />

          <CreateAppointmentDialog
            clinicId={clinicId}
            defaultDate={todayCalendarDate()}
            initialPatient={{
              id: patient.id,
              fullName: patient.fullName,
              phoneNumber: patient.phoneNumber,
            }}
            onOpenChange={setAppointmentOpen}
            open={isAppointmentOpen}
          />

          <EditPatientDialog
            clinicId={clinicId}
            onOpenChange={setEditOpen}
            open={isEditOpen}
            patient={patient}
          />

          <DeletePatientDialog
            clinicId={clinicId}
            onDeleted={() => void navigate({ to: '/patients' })}
            onOpenChange={setDeleteOpen}
            open={isDeleteOpen}
            patient={patient}
          />
        </div>
      )}
    </QueryBoundary>
  )
}

const quickActionClassName = cn(
  'flex min-h-16 flex-col items-center justify-center gap-1 rounded-control bg-accent-soft px-1',
  'text-caption font-medium text-accent-text transition-colors duration-150 ease-out-apple',
  'disabled:pointer-events-none disabled:opacity-40',
)

function QuickAction({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button className={quickActionClassName} disabled={disabled} onClick={onClick} type="button">
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}

function SidebarFact({ icon, value }: { icon: ReactNode; value: string | null }) {
  if (value === null) return null
  return (
    <div className="flex items-center gap-2 text-callout text-text">
      <span aria-hidden="true" className="text-text-tertiary">
        {icon}
      </span>
      {value}
    </div>
  )
}

function PatientSidebar({
  patient,
  onNewAppointment,
  onNewTreatment,
  onWritePrescription,
}: {
  patient: Patient
  onNewAppointment: () => void
  onNewTreatment: () => void
  onWritePrescription: () => void
}) {
  const { t, i18n } = useTranslation(['patients', 'common'])
  const locale = i18n.language
  const currencyLabel = t('common:currency.som')

  const birthDate =
    patient.birthDate === null ? null : formatCalendarDate(patient.birthDate, locale)
  const phoneDisplay =
    patient.phoneNumber === null
      ? null
      : `+998-${formatSubscriber(subscriberDigitsOf(patient.phoneNumber))}`

  // Guards the same way `formatSom`'s callers already have to: a patient with
  // nothing billed yet must read as "nothing owed", not as a division by zero.
  const paidRatio =
    patient.totalTreatmentCost === 0 ? 1 : patient.totalPaid / patient.totalTreatmentCost
  const progressPercent = Math.min(100, Math.max(0, Math.round(paidRatio * 100)))

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <PatientAvatar imageUrl={patient.imageUrl} name={patient.fullName} size="lg" />
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-title2 text-text">{patient.fullName}</h1>
          <PatientStatusBadge status={patient.status} />
        </div>
      </div>

      {/* Phone replacement for the header's button row, which would wrap into
          three lines there. The header keeps edit/delete, used far less. */}
      <div className="grid grid-cols-4 gap-2 md:hidden">
        {patient.phoneNumber === null ? (
          <QuickAction
            disabled
            icon={<Phone className="size-5" />}
            label={t('patients:detail.quick.call')}
          />
        ) : (
          <a className={quickActionClassName} href={`tel:${patient.phoneNumber}`}>
            <Phone aria-hidden="true" className="size-5" />
            {t('patients:detail.quick.call')}
          </a>
        )}
        <QuickAction
          icon={<CalendarPlus className="size-5" />}
          label={t('patients:detail.quick.appointment')}
          onClick={onNewAppointment}
        />
        <QuickAction
          icon={<Stethoscope className="size-5" />}
          label={t('patients:detail.quick.treatment')}
          onClick={onNewTreatment}
        />
        <QuickAction
          icon={<Pill className="size-5" />}
          label={t('patients:detail.quick.prescription')}
          onClick={onWritePrescription}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        {phoneDisplay === null ? null : (
          <a
            className="flex items-center gap-2 text-callout text-accent-text hover:underline"
            href={`tel:${patient.phoneNumber}`}
          >
            <Phone aria-hidden="true" className="size-4" />
            {phoneDisplay}
          </a>
        )}
        <SidebarFact icon={<Stethoscope className="size-4" />} value={patient.doctorName} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <SidebarFact icon={<Calendar className="size-4" />} value={birthDate} />
        <SidebarFact
          icon={<Cake className="size-4" />}
          value={patient.age === null ? null : t('patients:detail.ageYears', { age: patient.age })}
        />
        <SidebarFact icon={<MapPin className="size-4" />} value={patient.address} />
        <SidebarFact icon={<Briefcase className="size-4" />} value={patient.office} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-caption text-text-tertiary uppercase">
            {t('patients:column.remaining')}
          </span>
          <Badge tone="neutral">
            {t('patients:detail.visitCount', { count: patient.visitNumber })}
          </Badge>
        </div>

        <span
          className={
            patient.totalRemaining === 0 ? 'text-title2 text-success' : 'text-title2 text-text'
          }
        >
          {formatSom(patient.totalRemaining, locale, currencyLabel)}
        </span>

        <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <span className="text-caption text-text-secondary">
          {t('patients:detail.totalPaidOf', {
            paid: formatSom(patient.totalPaid, locale, currencyLabel),
            total: formatSom(patient.totalTreatmentCost, locale, currencyLabel),
          })}
        </span>
      </div>
    </Card>
  )
}

/** A tab name with its item count raised to the top-right, like a notification dot. */
function TabLabel({ children, count }: { children: string; count: number | undefined }) {
  return (
    <span className="inline-flex items-start gap-1">
      {children}
      {/* Absent until the list has loaded: a "0" that flips to "5" reads as a change. */}
      {count === undefined ? null : (
        <span
          className={cn(
            'inline-flex h-5 min-w-5 -translate-y-1 items-center justify-center rounded-full px-1',
            'text-caption leading-none font-semibold tabular-nums',
            count === 0 ? 'bg-sunken text-text-tertiary' : 'bg-accent text-on-accent',
          )}
        >
          {count}
        </span>
      )}
    </span>
  )
}

function PatientTabs({
  patient,
  onOpenComposer,
  onOpenRecipeEditor,
}: {
  patient: Patient
  onOpenComposer: (treatment: Treatment | null) => void
  onOpenRecipeEditor: () => void
}) {
  const { t } = useTranslation(['patients', 'common'])
  const { clinicId } = Route.useRouteContext()
  const [deletingTreatment, setDeletingTreatment] = useState<Treatment | null>(null)
  // The same queries (and cache entries) the tabs' own contents read, so the
  // counts cost no extra request once a tab has been opened.
  const treatmentCount = useQuery(treatmentQueries.list(clinicId, patient.id)).data?.length
  const recipeCount = useQuery(recipeQueries.list(clinicId, patient.id)).data?.length

  return (
    <>
      <Tabs
        items={[
          {
            value: 'general',
            label: t('patients:detail.tabGeneral'),
            content: (
              <Card className="p-6">
                <TreatmentToothChart
                  clinicId={clinicId}
                  onComplete={() => toast.info(t('patients:detail.comingSoon'))}
                  onDelete={setDeletingTreatment}
                  onEdit={onOpenComposer}
                  onTakePayment={() => toast.info(t('patients:detail.comingSoon'))}
                  patientId={patient.id}
                />
              </Card>
            ),
          },
          {
            value: 'treatments',
            label: <TabLabel count={treatmentCount}>{t('patients:detail.tabTreatments')}</TabLabel>,
            content: (
              <TreatmentHistoryTable
                clinicId={clinicId}
                onComplete={() => toast.info(t('patients:detail.comingSoon'))}
                onCreate={() => onOpenComposer(null)}
                onDelete={setDeletingTreatment}
                onEdit={onOpenComposer}
                onTakePayment={() => toast.info(t('patients:detail.comingSoon'))}
                patientId={patient.id}
              />
            ),
          },
          {
            value: 'prescriptions',
            label: <TabLabel count={recipeCount}>{t('patients:detail.tabPrescriptions')}</TabLabel>,
            content: (
              <Card className="p-6">
                <PrescriptionCards
                  clinicId={clinicId}
                  onCreate={onOpenRecipeEditor}
                  onDelete={() => toast.info(t('patients:detail.comingSoon'))}
                  onEdit={() => toast.info(t('patients:detail.comingSoon'))}
                  onPrint={() => toast.info(t('patients:detail.comingSoon'))}
                  patientId={patient.id}
                />
              </Card>
            ),
          },
          {
            value: 'gallery',
            label: (
              <TabLabel count={patient.gallery.length}>{t('patients:detail.tabGallery')}</TabLabel>
            ),
            content: (
              <Card className="p-6">
                <div className="flex flex-col gap-4">
                  <GalleryDropzone clinicId={clinicId} patientId={patient.id} />
                  {patient.gallery.length === 0 ? null : (
                    <PatientGallery images={patient.gallery} />
                  )}
                </div>
              </Card>
            ),
          },
        ]}
      />

      {deletingTreatment === null ? null : (
        <DeleteTreatmentDialog
          clinicId={clinicId}
          onDeleted={() => setDeletingTreatment(null)}
          onOpenChange={(open) => {
            if (!open) setDeletingTreatment(null)
          }}
          open
          treatment={deletingTreatment}
        />
      )}
    </>
  )
}

function PatientDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}
