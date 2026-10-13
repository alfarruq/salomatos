import { valibotResolver } from '@hookform/resolvers/valibot'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { doctorTypeQueries, isDentalDoctorType } from '@/entities/doctor-type'
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

  const doctorTypesQuery = useQuery(doctorTypeQueries.list(clinicId))
  const doctorTypeOptions = (doctorTypesQuery.data ?? []).map((doctorType) => ({
    value: String(doctorType.id),
    label: doctorType.name,
  }))

  /*
   * Most clinics on this product are dental (§1), so a new service starts on
   * the dental type. Matched with `isDentalDoctorType` rather than one exact
   * name, because clinics spell it themselves (the live one has "Stamatolog").
   * A clinic without such a type keeps the unassigned select.
   */
  const defaultDoctorTypeId = (doctorTypesQuery.data ?? []).find((doctorType) =>
    isDentalDoctorType(doctorType.name),
  )?.id

  const { setValue } = form
  // Same pattern as `CreateDoctorDialog`: only while the field is untouched,
  // and without `shouldDirty`, so the person's own pick always wins.
  useEffect(() => {
    if (defaultDoctorTypeId === undefined) return
    if (form.formState.dirtyFields.doctorTypeId) return

    setValue('doctorTypeId', String(defaultDoctorTypeId))
  }, [defaultDoctorTypeId, form.formState.dirtyFields.doctorTypeId, setValue])

  const handleSubmit = form.handleSubmit((values) =>
    mutate(values, {
      onSuccess: () => {
        // Back to the default, not unassigned: `reset` clears `dirtyFields`,
        // which leaves the effect above nothing to react to.
        form.reset({
          ...emptyTreatmentTypeForm,
          doctorTypeId: defaultDoctorTypeId === undefined ? '' : String(defaultDoctorTypeId),
        })
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
        <TreatmentTypeFormFields
          doctorTypeOptions={doctorTypeOptions}
          form={form}
          isDisabled={isPending}
        />
      </form>
    </Dialog>
  )
}
