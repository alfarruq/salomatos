import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  ClinicFormFields,
  type ClinicFormInput,
  clinicFormFieldOf,
  clinicFormSchema,
  emptyClinicForm,
} from '@/entities/clinic'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Card } from '@/shared/ui'
import { useCreateClinic } from '../model/useCreateClinic'

export interface CreateClinicFormProps {
  clinicId: number
}

/**
 * First-time setup for the clinic's own profile.
 *
 * A plain form on the page rather than a dialog: there is nothing to compare
 * it against yet, and once it exists this screen is replaced by
 * `ClinicSummaryCard` — see `pages/_auth/admin/clinic.tsx`.
 */
export function CreateClinicForm({ clinicId }: CreateClinicFormProps) {
  const { t } = useTranslation(['admin', 'common'])

  const form = useForm<ClinicFormInput>({
    resolver: valibotResolver(clinicFormSchema),
    mode: 'onBlur',
    defaultValues: emptyClinicForm,
  })

  const { mutate, isPending } = useCreateClinic(clinicId)

  const handleSubmit = form.handleSubmit((values) =>
    mutate(values, {
      onError: (error) => {
        if (!(error instanceof ApiError)) {
          form.setError('root', { message: t('admin:clinic.createFailed') })
          return
        }

        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const first = messages[0]
          if (first === undefined) continue
          form.setError(clinicFormFieldOf(field), { message: first })
        }

        if (Object.keys(error.fieldErrors).length === 0) {
          form.setError('root', {
            message:
              error.kind === 'network' ? t('common:error.network') : t('admin:clinic.createFailed'),
          })
        }
      },
    }),
  )

  const rootError = form.formState.errors.root?.message

  return (
    <Card className="flex max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-title2 text-text">{t('admin:clinic.setupTitle')}</h2>
        <p className="text-callout text-text-secondary">{t('admin:clinic.setupDescription')}</p>
      </div>

      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {rootError ? <Alert title={rootError} tone="danger" /> : null}
        <ClinicFormFields form={form} isDisabled={isPending} />

        <div>
          <Button isLoading={isPending} type="submit" variant="primary">
            {t('common:action.save')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
