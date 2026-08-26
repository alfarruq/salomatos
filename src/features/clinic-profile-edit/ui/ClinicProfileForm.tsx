import { valibotResolver } from '@hookform/resolvers/valibot'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Session } from '@/entities/session'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Card, Field, Input, PhoneInput, Textarea } from '@/shared/ui'
import {
  type ClinicProfileInput,
  clinicProfileFieldOf,
  clinicProfileSchema,
  toClinicProfileForm,
} from '../model/schema'
import { useUpdateClinicProfile } from '../model/useUpdateClinicProfile'

export interface ClinicProfileFormProps {
  session: Session
}

export function ClinicProfileForm({ session }: ClinicProfileFormProps) {
  const { t } = useTranslation(['admin', 'validation', 'common'])
  const [isSaved, setSaved] = useState(false)

  const form = useForm<ClinicProfileInput>({
    resolver: valibotResolver(clinicProfileSchema),
    mode: 'onBlur',
    defaultValues: toClinicProfileForm(session),
  })

  const { reset } = form
  // The session refetches after a save, so the form follows the record rather
  // than keeping whatever was typed before it was confirmed.
  useEffect(() => {
    reset(toClinicProfileForm(session))
  }, [session, reset])

  const { mutate, isPending } = useUpdateClinicProfile()

  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    return value.startsWith('validation.') ? t(value.replace('validation.', 'validation:')) : value
  }

  const handleSubmit = form.handleSubmit((values) => {
    setSaved(false)
    mutate(
      { userId: session.userId, input: values },
      {
        onSuccess: () => setSaved(true),
        onError: (error) => {
          if (!(error instanceof ApiError)) {
            form.setError('root', { message: t('admin:clinic.saveFailed') })
            return
          }

          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const first = messages[0]
            if (first === undefined) continue
            form.setError(clinicProfileFieldOf(field), { message: first })
          }

          if (Object.keys(error.fieldErrors).length === 0) {
            form.setError('root', {
              message:
                error.kind === 'network' ? t('common:error.network') : t('admin:clinic.saveFailed'),
            })
          }
        },
      },
    )
  })

  const rootError = form.formState.errors.root?.message
  const errors = form.formState.errors

  return (
    <Card className="flex max-w-lg flex-col gap-6 p-6">
      <p className="text-callout text-text-secondary">{t('admin:clinic.description')}</p>

      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {rootError ? <Alert title={rootError} tone="danger" /> : null}
        {isSaved && rootError === undefined ? (
          <Alert title={t('admin:clinic.saved')} tone="success" />
        ) : null}

        <Field error={message(errors.name?.message)} isRequired label={t('admin:clinic.name')}>
          <Input autoComplete="off" disabled={isPending} {...form.register('name')} />
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
                disabled={isPending}
                name={field.name}
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
        </Field>

        <Field error={message(errors.email?.message)} label={t('admin:clinic.email')}>
          <Input autoComplete="off" disabled={isPending} type="email" {...form.register('email')} />
        </Field>

        <Field
          description={t('admin:clinic.descriptionHint')}
          error={message(errors.description?.message)}
          label={t('admin:clinic.about')}
        >
          <Textarea disabled={isPending} rows={4} {...form.register('description')} />
        </Field>

        <div>
          <Button isLoading={isPending} type="submit" variant="primary">
            {t('common:action.save')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
