import { Controller, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field, Input, MoneyInput, Select, type SelectOption } from '@/shared/ui'
import type { TreatmentTypeFormInput } from '../model/formSchema'

export interface TreatmentTypeFormFieldsProps {
  form: UseFormReturn<TreatmentTypeFormInput>
  isDisabled?: boolean
  /**
   * Doctor-type choices, as plain `{value, label}` pairs rather than the
   * `entities/doctor-type` shape — an entity may not import another entity
   * (§4), so the feature that fetches the list converts it before it gets here.
   */
  doctorTypeOptions: SelectOption[]
}

/** A service's writable fields. Passive — the feature owns the mutation (§3.2). */
export function TreatmentTypeFormFields({
  form,
  isDisabled = false,
  doctorTypeOptions,
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
        <Controller
          control={form.control}
          name="price"
          render={({ field }) => (
            <MoneyInput
              disabled={isDisabled}
              name={field.name}
              onChange={field.onChange}
              placeholder="1,200,000"
              value={field.value}
            />
          )}
        />
      </Field>

      <Field label={t('admin:service.doctorType')}>
        <Controller
          control={form.control}
          name="doctorTypeId"
          render={({ field }) => (
            <Select
              disabled={isDisabled}
              name={field.name}
              onValueChange={field.onChange}
              options={doctorTypeOptions}
              placeholder={t('admin:service.doctorTypePlaceholder')}
              value={field.value}
            />
          )}
        />
      </Field>
    </div>
  )
}
