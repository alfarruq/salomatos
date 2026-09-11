import { Controller, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field, Input, PhoneInput } from '@/shared/ui'
import type { ClinicFormInput } from '../model/formSchema'
import { WorkingHoursFields } from './WorkingHoursFields'

export interface ClinicFormFieldsProps {
  form: UseFormReturn<ClinicFormInput>
  isDisabled?: boolean
}

/** A clinic's writable fields. Passive — the feature owns the mutation (§3.2). */
export function ClinicFormFields({ form, isDisabled = false }: ClinicFormFieldsProps) {
  const { t } = useTranslation(['admin', 'validation'])

  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    return value.startsWith('validation.') ? t(value.replace('validation.', 'validation:')) : value
  }

  const errors = form.formState.errors

  return (
    <div className="flex flex-col gap-4">
      <Field error={message(errors.name?.message)} isRequired label={t('admin:clinic.name')}>
        <Input autoComplete="off" disabled={isDisabled} {...form.register('name')} />
      </Field>

      <Field
        error={message(errors.phoneNumber?.message)}
        isRequired
        label={t('admin:clinic.phoneNumber')}
      >
        <Controller
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <PhoneInput
              disabled={isDisabled}
              name={field.name}
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
      </Field>

      <Field error={message(errors.address?.message)} isRequired label={t('admin:clinic.address')}>
        <Input autoComplete="off" disabled={isDisabled} {...form.register('address')} />
      </Field>

      <WorkingHoursFields form={form} isDisabled={isDisabled} />
    </div>
  )
}
