import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  emptyTreatmentTypeForm,
  TreatmentTypeFormFields,
  type TreatmentTypeFormInput,
  treatmentTypeFormFieldOf,
  treatmentTypeFormSchema,
} from '@/entities/treatment-type'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Dialog } from '@/shared/ui'
import { useCreateTreatmentType } from '../model/useCreateTreatmentType'

export interface CreateTreatmentTypeDialogProps {
  clinicId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-treatment-type-form'

export function CreateTreatmentTypeDialog({
  clinicId,
  open,
  onOpenChange,
}: CreateTreatmentTypeDialogProps) {
  const { t } = useTranslation(['admin', 'common'])

  const form = useForm<TreatmentTypeFormInput>({
    resolver: valibotResolver(treatmentTypeFormSchema),
    mode: 'onBlur',
    defaultValues: emptyTreatmentTypeForm,
  })

  const { mutate, isPending } = useCreateTreatmentType(clinicId)

  const handleSubmit = form.handleSubmit((values) =>
    mutate(values, {
      onSuccess: () => {
        form.reset(emptyTreatmentTypeForm)
        onOpenChange(false)
      },
      onError: (error) => {
        if (!(error instanceof ApiError)) {
          form.setError('root', { message: t('admin:service.createFailed') })
          return
        }

        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const first = messages[0]
          if (first === undefined) continue
          form.setError(treatmentTypeFormFieldOf(field), { message: first })
        }

        if (Object.keys(error.fieldErrors).length === 0) {
          form.setError('root', {
            message:
              error.kind === 'network'
                ? t('common:error.network')
                : t('admin:service.createFailed'),
          })
        }
      },
    }),
  )

  const rootError = form.formState.errors.root?.message

  return (
    <Dialog
      description={t('admin:service.createDescription')}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)} variant="secondary">
            {t('common:action.cancel')}
          </Button>
          <Button form={FORM_ID} isLoading={isPending} type="submit" variant="primary">
            {t('admin:service.create')}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t('admin:service.createTitle')}
    >
      <form className="flex flex-col gap-4" id={FORM_ID} noValidate onSubmit={handleSubmit}>
        {rootError ? <Alert title={rootError} tone="danger" /> : null}
        <TreatmentTypeFormFields form={form} isDisabled={isPending} />
      </form>
    </Dialog>
  )
}
