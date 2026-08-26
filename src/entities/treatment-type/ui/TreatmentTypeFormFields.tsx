import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field, Input } from '@/shared/ui'
import type { TreatmentTypeFormInput } from '../model/formSchema'

export interface TreatmentTypeFormFieldsProps {
  form: UseFormReturn<TreatmentTypeFormInput>
  isDisabled?: boolean
}

/** A service's writable fields. Passive — the feature owns the mutation (§3.2). */
export function TreatmentTypeFormFields({
  form,
  isDisabled = false,
}: TreatmentTypeFormFieldsProps) {
  const { t } = useTranslation(['admin', 'validation'])

  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    return value.startsWith('validation.') ? t(value.replace('validation.', 'validation:')) : value
  }

  const errors = form.formState.errors

  return (
    <div className="flex flex-col gap-4">
      <Field error={message(errors.name?.message)} isRequired label={t('admin:service.name')}>
        <Input autoComplete="off" disabled={isDisabled} {...form.register('name')} />
      </Field>

      <Field
        description={t('admin:service.priceHint')}
        error={message(errors.price?.message)}
        label={t('admin:service.price')}
      >
        <Input
          autoComplete="off"
          disabled={isDisabled}
          // Numeric keypad on the tablet at reception, but still a text field:
          // `type="number"` brings spinners, scroll-wheel edits and a value
          // that silently becomes empty on a stray character.
          inputMode="numeric"
          placeholder="1200000"
          {...form.register('price')}
        />
      </Field>
    </div>
  )
}
