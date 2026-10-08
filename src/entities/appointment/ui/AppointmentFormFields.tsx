import { X } from 'lucide-react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  DatePicker,
  Field,
  Input,
  PhoneInput,
  Select,
  type SelectOption,
  Textarea,
} from '@/shared/ui'
import type { AppointmentFormInput } from '../model/formSchema'

/** Bookable slots, 30 minutes apart, 07:00 through 20:00. */
const APPOINTMENT_TIME_OPTIONS: SelectOption[] = (() => {
  const options: SelectOption[] = []
  for (let hour = 7; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 20 && minute > 0) break
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      options.push({ value: time, label: time })
    }
  }
  return options
})()

export interface AppointmentPatientResult {
  id: number
  fullName: string
  phoneNumber: string | null
}

export interface AppointmentPatientPickerProps {
  searchTerm: string
  onSearchTermChange: (term: string) => void
  results: AppointmentPatientResult[]
  /** Null when nothing is linked yet — a walk-in, or not chosen this session. */
  linkedPatientName: string | null
  onSelect: (patient: AppointmentPatientResult) => void
  onUnlink: () => void
}

export interface AppointmentFormFieldsProps {
  form: UseFormReturn<AppointmentFormInput>
  isDisabled?: boolean
  /**
   * Doctor choices, as plain `{value, label}` pairs — an entity may not import
   * another entity (§4), so the feature fetching the list converts it first,
   * same as `DoctorFormFields.doctorTypeOptions`.
   */
  doctorOptions: SelectOption[]
  /** A fresh appointment always starts `in_progress` — only edit shows this. */
  showStatus?: boolean
  patientPicker: AppointmentPatientPickerProps
}

/**
 * An appointment's writable fields. Passive — the feature owns the mutation
 * and the patient search it drives (§3.2).
 */
export function AppointmentFormFields({
  form,
  isDisabled = false,
  doctorOptions,
  showStatus = false,
  patientPicker,
}: AppointmentFormFieldsProps) {
  const { t } = useTranslation(['appointments', 'validation'])

  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    return value.startsWith('validation.') ? t(value.replace('validation.', 'validation:')) : value
  }

  const errors = form.formState.errors

  return (
    <div className="flex flex-col gap-4">
      <Field label={t('appointments:form.patient')}>
        {patientPicker.linkedPatientName === null ? (
          <div className="flex flex-col gap-2">
            <Input
              autoComplete="off"
              disabled={isDisabled}
              onChange={(event) => patientPicker.onSearchTermChange(event.target.value)}
              placeholder={t('appointments:form.patientSearchPlaceholder')}
              type="search"
              value={patientPicker.searchTerm}
            />
            {patientPicker.searchTerm === '' || patientPicker.results.length === 0 ? null : (
              <ul className="flex flex-col gap-1 rounded-control border border-border bg-elevated p-1">
                {patientPicker.results.map((result) => (
                  <li key={result.id}>
                    <button
                      className="flex w-full flex-col rounded-[8px] px-3 py-2 text-left hover:bg-sunken"
                      onClick={() => patientPicker.onSelect(result)}
                      type="button"
                    >
                      <span className="text-body text-text">{result.fullName}</span>
                      {result.phoneNumber === null ? null : (
                        <span className="text-caption text-text-secondary">
                          {result.phoneNumber}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-control border border-border bg-sunken px-4 py-2">
            <span className="text-body text-text">{patientPicker.linkedPatientName}</span>
            <button
              aria-label={t('appointments:form.unlinkPatient')}
              disabled={isDisabled}
              onClick={patientPicker.onUnlink}
              type="button"
            >
              <X aria-hidden="true" className="size-4 text-text-secondary" />
            </button>
          </div>
        )}
      </Field>

      <Field
        description={
          patientPicker.linkedPatientName === null
            ? undefined
            : t('appointments:form.fullNameLinkedHint')
        }
        error={message(errors.fullName?.message)}
        isRequired
        label={t('appointments:form.fullName')}
      >
        <Input
          autoComplete="off"
          disabled={isDisabled || patientPicker.linkedPatientName !== null}
          {...form.register('fullName')}
        />
      </Field>

      <Field
        error={message(errors.phoneNumber?.message)}
        isRequired
        label={t('appointments:form.phoneNumber')}
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

      <Field
        error={message(errors.doctorId?.message)}
        isRequired
        label={t('appointments:form.doctor')}
      >
        <Controller
          control={form.control}
          name="doctorId"
          render={({ field }) => (
            <Select
              disabled={isDisabled}
              name={field.name}
              onValueChange={field.onChange}
              options={doctorOptions}
              placeholder={t('appointments:form.doctorPlaceholder')}
              value={field.value}
            />
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field error={message(errors.date?.message)} isRequired label={t('appointments:form.date')}>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <DatePicker
                disabled={isDisabled}
                nextMonthLabel={t('appointments:form.nextMonth')}
                onChange={field.onChange}
                placeholder={t('appointments:form.datePlaceholder')}
                previousMonthLabel={t('appointments:form.previousMonth')}
                value={field.value}
              />
            )}
          />
        </Field>

        <Field error={message(errors.time?.message)} isRequired label={t('appointments:form.time')}>
          <Controller
            control={form.control}
            name="time"
            render={({ field }) => (
              <Select
                disabled={isDisabled}
                name={field.name}
                onValueChange={field.onChange}
                options={APPOINTMENT_TIME_OPTIONS}
                placeholder={t('appointments:form.time')}
                value={field.value}
              />
            )}
          />
        </Field>
      </div>

      {showStatus ? (
        <Field label={t('appointments:form.status')}>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                disabled={isDisabled}
                name={field.name}
                onValueChange={field.onChange}
                options={[
                  { value: 'in_progress', label: t('appointments:status.in_progress') },
                  { value: 'completed', label: t('appointments:status.completed') },
                ]}
                value={field.value}
              />
            )}
          />
        </Field>
      ) : null}

      <Field error={message(errors.notes?.message)} label={t('appointments:form.notes')}>
        <Textarea disabled={isDisabled} {...form.register('notes')} />
      </Field>
    </div>
  )
}
