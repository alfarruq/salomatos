import { Controller, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field, Input, PhoneInput } from '@/shared/ui'
import type { DoctorFormInput } from '../model/formSchema'

export interface DoctorFormFieldsProps {
  form: UseFormReturn<DoctorFormInput>
  isDisabled?: boolean
}

/**
 * A doctor's writable fields, and nothing else — no submit, no mutation.
 *
 * Passive, so it stays an entity (§3.2), and shared so that creating and
 * editing cannot drift apart without either feature importing the other.
 */
export function DoctorFormFields({ form, isDisabled = false }: DoctorFormFieldsProps) {
  const { t } = useTranslation(['admin', 'validation'])

  /** Valibot and the server both speak `validation.<code>` — see §10. */
  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    return value.startsWith('validation.') ? t(value.replace('validation.', 'validation:')) : value
  }

  const errors = form.formState.errors

  return (
    <div className="flex flex-col gap-4">
      <Field
        error={message(errors.fullName?.message)}
        isRequired
        label={t('admin:doctor.fullName')}
      >
        <Input autoComplete="off" disabled={isDisabled} {...form.register('fullName')} />
      </Field>

      <Field
        error={message(errors.phoneNumber?.message)}
        isRequired
        label={t('admin:doctor.phoneNumber')}
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

      <Field error={message(errors.specialty?.message)} label={t('admin:doctor.specialty')}>
        <Input
          autoComplete="off"
          disabled={isDisabled}
          placeholder={t('admin:doctor.specialtyPlaceholder')}
          {...form.register('specialty')}
        />
      </Field>

      <Field error={message(errors.email?.message)} label={t('admin:doctor.email')}>
        <Input autoComplete="off" disabled={isDisabled} type="email" {...form.register('email')} />
      </Field>
    </div>
  )
}
