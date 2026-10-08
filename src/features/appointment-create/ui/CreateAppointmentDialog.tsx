import { valibotResolver } from '@hookform/resolvers/valibot'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  AppointmentFormFields,
  type AppointmentFormInput,
  type AppointmentPatientResult,
  appointmentFormFieldOf,
  appointmentFormSchema,
  emptyAppointmentForm,
} from '@/entities/appointment'
import { doctorQueries } from '@/entities/doctor'
import { defaultPatientFilters, patientQueries } from '@/entities/patient'
import { ApiError } from '@/shared/api/errors'
import type { CalendarDate } from '@/shared/lib/calendarDate'
import { useDebounce } from '@/shared/lib/useDebounce'
import { Alert, Button, Dialog } from '@/shared/ui'
import { useCreateAppointment } from '../model/useCreateAppointment'

export interface CreateAppointmentDialogProps {
  clinicId: number
  /** The day currently open in the calendar — where a new appointment starts. */
  defaultDate: CalendarDate
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Pre-links a patient — the "new appointment" action on that patient's own
   * page, as opposed to the calendar's, which starts with nothing linked.
   */
  initialPatient?: AppointmentPatientResult
}

const FORM_ID = 'create-appointment-form'
const PATIENT_SEARCH_DEBOUNCE_MS = 300

function initialFormValues(
  defaultDate: CalendarDate,
  initialPatient: AppointmentPatientResult | undefined,
): AppointmentFormInput {
  return {
    ...emptyAppointmentForm,
    date: defaultDate,
    ...(initialPatient === undefined
      ? {}
      : {
          patientId: String(initialPatient.id),
          fullName: initialPatient.fullName,
          phoneNumber: initialPatient.phoneNumber ?? '',
        }),
  }
}

export function CreateAppointmentDialog({
  clinicId,
  defaultDate,
  open,
  onOpenChange,
  initialPatient,
}: CreateAppointmentDialogProps) {
  const { t } = useTranslation(['appointments', 'common'])

  const form = useForm<AppointmentFormInput>({
    resolver: valibotResolver(appointmentFormSchema),
    mode: 'onBlur',
    defaultValues: initialFormValues(defaultDate, initialPatient),
  })

  const { mutate, isPending } = useCreateAppointment(clinicId)

  const doctorsQuery = useQuery(doctorQueries.list(clinicId))
  const doctorOptions = (doctorsQuery.data ?? []).map((doctor) => ({
    value: String(doctor.id),
    label: doctor.fullName,
  }))

  /*
   * A search, not a full list — a clinic's patient roster is exactly the
   * unbounded case `usePatientSearch`/`PatientSearchInput` were built to keep
   * out of the URL (§3). This duplicates that hook's few lines rather than
   * importing `features/patient-search`, which §4 forbids between two
   * features of the same layer.
   */
  const [patientTerm, setPatientTerm] = useState('')
  const debouncedPatientTerm = useDebounce(patientTerm, PATIENT_SEARCH_DEBOUNCE_MS)
  const [linkedPatient, setLinkedPatient] = useState<AppointmentPatientResult | null>(
    initialPatient ?? null,
  )

  const patientsQuery = useQuery({
    ...patientQueries.list(clinicId, { ...defaultPatientFilters, search: debouncedPatientTerm }),
    enabled: debouncedPatientTerm !== '',
  })
  const patientResults: AppointmentPatientResult[] = (patientsQuery.data?.results ?? []).map(
    (patient) => ({ id: patient.id, fullName: patient.fullName, phoneNumber: patient.phoneNumber }),
  )

  const handleSelectPatient = (patient: AppointmentPatientResult) => {
    setLinkedPatient(patient)
    setPatientTerm('')
    form.setValue('patientId', String(patient.id), { shouldDirty: true })
    form.setValue('fullName', patient.fullName, { shouldDirty: true })
    form.setValue('phoneNumber', patient.phoneNumber ?? '', { shouldDirty: true })
  }

  const handleUnlinkPatient = () => {
    setLinkedPatient(null)
    form.setValue('patientId', '', { shouldDirty: true })
  }

  const handleSubmit = form.handleSubmit((values) =>
    mutate(values, {
      onSuccess: () => {
        form.reset(initialFormValues(defaultDate, initialPatient))
        setLinkedPatient(initialPatient ?? null)
        setPatientTerm('')
        onOpenChange(false)
      },
      onError: (error) => {
        if (!(error instanceof ApiError)) {
          form.setError('root', { message: t('appointments:create.failed') })
          return
        }

        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const first = messages[0]
          if (first === undefined) continue
          form.setError(appointmentFormFieldOf(field), { message: first })
        }

        if (Object.keys(error.fieldErrors).length === 0) {
          form.setError('root', {
            message:
              error.kind === 'network'
                ? t('common:error.network')
                : t('appointments:create.failed'),
          })
        }
      },
    }),
  )

  const rootError = form.formState.errors.root?.message

  return (
    <Dialog
      description={t('appointments:create.description')}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)} variant="secondary">
            {t('common:action.cancel')}
          </Button>
          <Button form={FORM_ID} isLoading={isPending} type="submit" variant="primary">
            {t('appointments:create.submit')}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t('appointments:create.title')}
    >
      <form className="flex flex-col gap-4" id={FORM_ID} noValidate onSubmit={handleSubmit}>
        {rootError ? <Alert title={rootError} tone="danger" /> : null}
        <AppointmentFormFields
          doctorOptions={doctorOptions}
          form={form}
          isDisabled={isPending}
          patientPicker={{
            searchTerm: patientTerm,
            onSearchTermChange: setPatientTerm,
            results: patientResults,
            linkedPatientName: linkedPatient?.fullName ?? null,
            onSelect: handleSelectPatient,
            onUnlink: handleUnlinkPatient,
          }}
        />
      </form>
    </Dialog>
  )
}
