import { valibotResolver } from '@hookform/resolvers/valibot'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Treatment } from '@/entities/treatment'
import { ApiError } from '@/shared/api/errors'
import { clinicNow } from '@/shared/lib/datetime'
import { formatSom } from '@/shared/lib/money'
import { Alert, Button, DatePicker, Dialog, Field, MoneyInput, Textarea, toast } from '@/shared/ui'
import {
  type PaymentFormInput,
  paymentFormFieldOf,
  paymentFormSchema,
  toPaymentPayload,
} from '../model/formSchema'
import { useCreatePayment } from '../model/useCreatePayment'

export interface TakePaymentDialogProps {
  clinicId: number
  treatment: Treatment
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'take-payment-form'

function debtOf(treatment: Treatment): number {
  return Math.max(treatment.remaining ?? 0, 0)
}

function defaultsOf(treatment: Treatment): PaymentFormInput {
  // Most patients settle the whole remainder, today.
  return { date: clinicNow().date, amount: String(debtOf(treatment)), note: '' }
}

/** Records money received toward one treatment. Only "paid": the clinic does not track how. */
export function TakePaymentDialog({
  clinicId,
  treatment,
  open,
  onOpenChange,
}: TakePaymentDialogProps) {
  const { t, i18n } = useTranslation(['treatments', 'common', 'validation'])
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const { mutate, isPending } = useCreatePayment(clinicId)
  const debt = debtOf(treatment)
  const schema = useMemo(
    () => paymentFormSchema(debt, treatment.startDate),
    [debt, treatment.startDate],
  )

  const form = useForm<PaymentFormInput>({
    resolver: valibotResolver(schema),
    mode: 'onBlur',
    defaultValues: defaultsOf(treatment),
  })

  const { reset } = form
  useEffect(() => {
    if (open) reset(defaultsOf(treatment))
  }, [open, reset, treatment])

  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    return value.startsWith('validation.') ? t(value.replace('validation.', 'validation:')) : value
  }

  const handleSubmit = form.handleSubmit((values) =>
    mutate(
      { payload: toPaymentPayload(treatment.id, values), idempotencyKey },
      {
        onSuccess: () => {
          setIdempotencyKey(crypto.randomUUID())
          toast.success(t('treatments:payment.success'))
          onOpenChange(false)
        },
        onError: (error) => {
          if (!(error instanceof ApiError)) {
            form.setError('root', { message: t('treatments:payment.failed') })
            return
          }
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const first = messages[0]
            if (first === undefined) continue
            form.setError(paymentFormFieldOf(field), { message: first })
          }
          if (Object.keys(error.fieldErrors).length === 0) {
            form.setError('root', {
              message:
                error.kind === 'network'
                  ? t('common:error.network')
                  : t('treatments:payment.failed'),
            })
          }
        },
      },
    ),
  )

  const errors = form.formState.errors
  const rootError = errors.root?.message

  return (
    <Dialog
      description={t('treatments:payment.description', {
        debt: formatSom(debt, i18n.language, t('common:currency.som')),
      })}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)} variant="secondary">
            {t('common:action.cancel')}
          </Button>
          <Button form={FORM_ID} isLoading={isPending} type="submit" variant="primary">
            {t('treatments:payment.submit')}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t('treatments:payment.title')}
    >
      <form className="flex flex-col gap-4" id={FORM_ID} noValidate onSubmit={handleSubmit}>
        {rootError ? <Alert title={message(rootError) ?? rootError} tone="danger" /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={message(errors.amount?.message)}
            isRequired
            label={t('treatments:payment.amount')}
          >
            <Controller
              control={form.control}
              name="amount"
              render={({ field }) => (
                <MoneyInput
                  disabled={isPending}
                  name={field.name}
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
          </Field>

          <Field
            error={message(errors.date?.message)}
            isRequired
            label={t('treatments:payment.date')}
          >
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  disabled={isPending}
                  locale={i18n.language}
                  max={clinicNow().date}
                  {...(treatment.startDate === null ? {} : { min: treatment.startDate })}
                  nextMonthLabel={t('treatments:payment.nextMonth')}
                  onChange={field.onChange}
                  placeholder={t('treatments:payment.datePlaceholder')}
                  previousMonthLabel={t('treatments:payment.previousMonth')}
                  value={field.value}
                />
              )}
            />
          </Field>
        </div>

        {/* Free text is where a diagnosis could slip in; the hint is the only guard here. */}
        <Field
          description={t('treatments:payment.noteHint')}
          error={message(errors.note?.message)}
          label={t('treatments:payment.note')}
        >
          <Textarea disabled={isPending} rows={2} {...form.register('note')} />
        </Field>
      </form>
    </Dialog>
  )
}
