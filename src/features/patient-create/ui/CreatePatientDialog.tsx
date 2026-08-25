import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  emptyPatientForm,
  PatientFormFields,
  type PatientFormInput,
  patientFormFieldOf,
  patientFormSchema,
} from '@/entities/patient'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Dialog } from '@/shared/ui'
import { useCreatePatient } from '../model/useCreatePatient'

export interface CreatePatientDialogProps {
  clinicId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function CreatePatientDialog({
  clinicId,
  open,
  onOpenChange,
  onCreated,
}: CreatePatientDialogProps) {
  const { t } = useTranslation(['patients', 'common'])

  const form = useForm<PatientFormInput>({
    resolver: valibotResolver(patientFormSchema),
    // onBlur, not onChange: validating every keystroke nags rather than helps.
    mode: 'onBlur',
    defaultValues: emptyPatientForm,
  })

  const { mutate, isPending } = useCreatePatient(clinicId)

  const handleSubmit = form.handleSubmit((values) =>
    mutate(values, {
      onSuccess: () => {
        form.reset(emptyPatientForm)
        onOpenChange(false)
        onCreated?.()
      },
      onError: (error) => {
        if (!(error instanceof ApiError)) return

        /*
         * §10 — server validation goes back onto the fields. The most likely
         * rejection here is `unique_phone_per_clinic`, which arrives as
         * `{"phone_number": "unique"}` and has to land on the phone input
         * rather than in a generic banner.
         */
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const first = messages[0]
          if (first === undefined) continue
          form.setError(patientFormFieldOf(field), { message: first })
        }

        if (Object.keys(error.fieldErrors).length === 0) {
          form.setError('root', {
            message:
              error.kind === 'network' ? t('common:error.network') : t('patients:create.failed'),
          })
        }
      },
    }),
  )

  const rootError = form.formState.errors.root?.message

  return (
    <Dialog
      description={t('patients:create.description')}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)} variant="secondary">
            {t('common:action.cancel')}
          </Button>
          <Button form={FORM_ID} isLoading={isPending} type="submit" variant="primary">
            {t('patients:create.submit')}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t('patients:create.title')}
    >
      <form className="flex flex-col gap-4" id={FORM_ID} noValidate onSubmit={handleSubmit}>
        {rootError ? <Alert title={rootError} tone="danger" /> : null}
        <PatientFormFields form={form} isDisabled={isPending} />
      </form>
    </Dialog>
  )
}

/** The submit button lives in the dialog footer, outside the form element. */
const FORM_ID = 'create-patient-form'
