import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  MAX_SMS_REMINDERS,
  type SmsSettings,
  type SmsSettingsFormInput,
  smsSettingsFormFieldOf,
  smsSettingsFormSchema,
  toSmsSettingsForm,
} from '@/entities/sms'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Card, Checkbox, Switch, toast } from '@/shared/ui'
import { useUpdateSmsSettings } from '../model/useUpdateSmsSettings'

export interface SmsSettingsFormProps {
  clinicId: number
  settings: SmsSettings
}

const HOURS_PER_DAY = 24

export function SmsSettingsForm({ clinicId, settings }: SmsSettingsFormProps) {
  const { t } = useTranslation(['admin', 'common', 'validation'])

  const form = useForm<SmsSettingsFormInput>({
    resolver: valibotResolver(smsSettingsFormSchema),
    defaultValues: toSmsSettingsForm(settings),
  })

  const { mutate, isPending } = useUpdateSmsSettings(clinicId)

  const handleSubmit = form.handleSubmit((values) =>
    mutate(values, {
      onSuccess: (saved) => {
        form.reset(toSmsSettingsForm(saved))
        toast.success(t('admin:sms.saved'))
      },
      onError: (error) => {
        if (!(error instanceof ApiError)) {
          form.setError('root', { message: t('admin:sms.saveFailed') })
          return
        }

        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const first = messages[0]
          if (first === undefined) continue
          form.setError(smsSettingsFormFieldOf(field), { message: first })
        }

        if (Object.keys(error.fieldErrors).length === 0) {
          form.setError('root', {
            message:
              error.kind === 'network' ? t('common:error.network') : t('admin:sms.saveFailed'),
          })
        }
      },
    }),
  )

  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    return value.startsWith('validation.') ? t(value.replace('validation.', 'validation:')) : value
  }

  const offsetLabel = (hours: number): string =>
    hours % HOURS_PER_DAY === 0
      ? t('admin:sms.offsetDays', { count: hours / HOURS_PER_DAY })
      : t('admin:sms.offsetHours', { count: hours })

  const enabled = form.watch('enabled')
  const isLocked = isPending || !enabled
  const rootError = form.formState.errors.root?.message
  const offsetsError = message(form.formState.errors.reminderOffsetsHours?.message)

  return (
    <Card className="p-6">
      <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
        {rootError ? <Alert title={rootError} tone="danger" /> : null}

        <div className="flex flex-col gap-1">
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <Switch
                checked={field.value}
                disabled={isPending}
                label={t('admin:sms.enabled')}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <p className="text-callout text-text-secondary">{t('admin:sms.enabledHint')}</p>
        </div>

        <fieldset aria-describedby="sms-offsets-hint" className="flex flex-col gap-2">
          <legend className="text-body font-medium text-text">{t('admin:sms.whenTitle')}</legend>
          <p className="text-callout text-text-secondary" id="sms-offsets-hint">
            {t('admin:sms.whenHint', { max: MAX_SMS_REMINDERS })}
          </p>
          <Controller
            control={form.control}
            name="reminderOffsetsHours"
            render={({ field }) => (
              <div className="flex flex-col gap-1">
                {settings.availableOffsetsHours.map((hours) => {
                  const isChecked = field.value.includes(hours)
                  // The cap is enforced by disabling the rest, not by an error after the fact.
                  const isFull = !isChecked && field.value.length >= MAX_SMS_REMINDERS
                  return (
                    <Checkbox
                      checked={isChecked}
                      disabled={isLocked || isFull}
                      key={hours}
                      label={offsetLabel(hours)}
                      onCheckedChange={(next) =>
                        field.onChange(
                          next === true
                            ? [...field.value, hours].sort((a, b) => b - a)
                            : field.value.filter((value) => value !== hours),
                        )
                      }
                    />
                  )
                })}
              </div>
            )}
          />
          {offsetsError ? (
            <p className="text-callout text-danger" role="alert">
              {offsetsError}
            </p>
          ) : null}
        </fieldset>

        <Controller
          control={form.control}
          name="sendOnCreate"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              disabled={isLocked}
              label={t('admin:sms.sendOnCreate')}
              onCheckedChange={(next) => field.onChange(next === true)}
            />
          )}
        />

        <div className="flex flex-col gap-2">
          <span className="text-body font-medium text-text">{t('admin:sms.previewTitle')}</span>
          <p className="rounded-control bg-sunken p-4 text-body text-text">{settings.preview}</p>
          <p className="text-callout text-text-secondary">{t('admin:sms.previewHint')}</p>
        </div>

        <div className="flex justify-end">
          <Button
            disabled={!form.formState.isDirty}
            isLoading={isPending}
            type="submit"
            variant="primary"
          >
            {t('common:action.save')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
