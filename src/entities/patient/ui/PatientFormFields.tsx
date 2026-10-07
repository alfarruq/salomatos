import { Controller, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { todayCalendarDate } from '@/shared/lib/calendarDate'
import { DatePicker, Field, Input, PhoneInput, Select, type SelectOption } from '@/shared/ui'
import type { PatientFormInput } from '../model/formSchema'

export interface PatientFormFieldsProps {
  form: UseFormReturn<PatientFormInput>
  isDisabled?: boolean
  /**
   * Doctor choices, as plain `{value, label}` pairs — an entity may not import
   * another entity (§4), so the feature fetching the list converts it first,
   * same as `AppointmentFormFields.doctorOptions`.
   */
  doctorOptions: SelectOption[]
}

/**
 * The patient's writable fields, and nothing else — no submit button, no
 * mutation, no dialog.
 *
 * That is what keeps it an entity (§3.2): it renders the shape of a patient
 * and hands every decision back to whichever feature owns the form. Creating
 * and editing then share one definition of what the fields are without either
 * feature importing the other, which §4 forbids.
 */
// Defaulted rather than forwarded as `boolean | undefined`: under
// `exactOptionalPropertyTypes` those are different types, and the controls
// below declare `disabled?: boolean`.
export function PatientFormFields({
  form,
  isDisabled = false,
  doctorOptions,
}: PatientFormFieldsProps) {
  const { t, i18n } = useTranslation(['patients', 'validation'])

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
        label={t('patients:form.fullName')}
      >
        <Input autoComplete="off" disabled={isDisabled} {...form.register('fullName')} />
      </Field>

      <Field
        error={message(errors.phoneNumber?.message)}
        isRequired
        label={t('patients:form.phoneNumber')}
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

      <Field error={message(errors.doctorId?.message)} isRequired label={t('patients:form.doctor')}>
        <Controller
          control={form.control}
          name="doctorId"
          render={({ field }) => (
            <Select
              disabled={isDisabled}
              name={field.name}
              onValueChange={field.onChange}
              options={doctorOptions}
              placeholder={t('patients:form.doctorPlaceholder')}
              value={field.value}
            />
          )}
        />
      </Field>

      <Field error={message(errors.birthDate?.message)} label={t('patients:form.birthDate')}>
        <Controller
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <DatePicker
              disabled={isDisabled}
              locale={i18n.language}
              /*
               * A birth date is never in the future, and the picker saying so
               * is cheaper than a server round trip.
               *
               * `todayCalendarDate()`, not `toISOString().slice(0, 10)` — the
               * latter is the UTC day, which before 05:00 in Tashkent is still
               * yesterday and would refuse a baby born this morning.
               */
              max={todayCalendarDate()}
              nextMonthLabel={t('patients:form.nextMonth')}
              onChange={field.onChange}
              placeholder={t('patients:form.birthDatePlaceholder')}
              previousMonthLabel={t('patients:form.previousMonth')}
              value={field.value}
            />
          )}
        />
      </Field>

      <Field error={message(errors.address?.message)} label={t('patients:form.address')}>
        <Input autoComplete="off" disabled={isDisabled} {...form.register('address')} />
      </Field>

      <Field error={message(errors.office?.message)} label={t('patients:form.office')}>
        <Input autoComplete="off" disabled={isDisabled} {...form.register('office')} />
      </Field>
    </div>
  )
}
