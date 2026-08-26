import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  DoctorFormFields,
  type DoctorFormInput,
  doctorFormFieldOf,
  doctorFormSchema,
  emptyDoctorForm,
} from '@/entities/doctor'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Dialog } from '@/shared/ui'
import { useCreateDoctor } from '../model/useCreateDoctor'

export interface CreateDoctorDialogProps {
  clinicId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const FORM_ID = 'create-doctor-form'

export function CreateDoctorDialog({
  clinicId,
  open,
  onOpenChange,
  onCreated,
}: CreateDoctorDialogProps) {
  const { t } = useTranslation(['admin', 'common'])

  const form = useForm<DoctorFormInput>({
    resolver: valibotResolver(doctorFormSchema),
    mode: 'onBlur',
    defaultValues: emptyDoctorForm,
  })

  const { mutate, isPending } = useCreateDoctor(clinicId)

  const handleSubmit = form.handleSubmit((values) =>
    mutate(values, {
      onSuccess: () => {
        form.reset(emptyDoctorForm)
        onOpenChange(false)
        onCreated?.()
      },
      onError: (error) => {
        if (!(error instanceof ApiError)) {
          form.setError('root', { message: t('admin:doctor.createFailed') })
          return
        }

        // §10 — the likely rejection here is `unique_phone_per_clinic`, which
        // belongs on the phone input rather than in a banner.
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const first = messages[0]
          if (first === undefined) continue
          form.setError(doctorFormFieldOf(field), { message: first })
        }

        if (Object.keys(error.fieldErrors).length === 0) {
          form.setError('root', {
            message:
              error.kind === 'network' ? t('common:error.network') : t('admin:doctor.createFailed'),
          })
        }
      },
    }),
  )

  const rootError = form.formState.errors.root?.message

  return (
    <Dialog
      description={t('admin:doctor.createDescription')}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)} variant="secondary">
            {t('common:action.cancel')}
          </Button>
          <Button form={FORM_ID} isLoading={isPending} type="submit" variant="primary">
            {t('admin:doctor.create')}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t('admin:doctor.createTitle')}
    >
      <form className="flex flex-col gap-4" id={FORM_ID} noValidate onSubmit={handleSubmit}>
        {rootError ? <Alert title={rootError} tone="danger" /> : null}
        <DoctorFormFields form={form} isDisabled={isPending} />
      </form>
    </Dialog>
  )
}
