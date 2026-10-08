import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field, Input } from '@/shared/ui'
import type { DoctorTypeFormInput } from '../model/formSchema'

export interface DoctorTypeFormFieldsProps {
  form: UseFormReturn<DoctorTypeFormInput>
  isDisabled?: boolean
}

/** A doctor type's one writable field. Passive — the feature owns the mutation (§3.2). */
export function DoctorTypeFormFields({ form, isDisabled = false }: DoctorTypeFormFieldsProps) {
  const { t } = useTranslation(['admin', 'validation'])

  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    return value.startsWith('validation.') ? t(value.replace('validation.', 'validation:')) : value
  }

  return (
    <Field
      error={message(form.formState.errors.name?.message)}
      isRequired
      label={t('admin:doctorType.name')}
    >
      <Input
        autoComplete="off"
        disabled={isDisabled}
        placeholder={t('admin:doctorType.namePlaceholder')}
        {...form.register('name')}
      />
    </Field>
  )
}
