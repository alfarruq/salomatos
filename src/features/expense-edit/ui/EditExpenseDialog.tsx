import { valibotResolver } from '@hookform/resolvers/valibot'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { doctorQueries } from '@/entities/doctor'
import {
  type Expense,
  ExpenseFormFields,
  type ExpenseFormInput,
  expenseFormFieldOf,
  expenseFormSchema,
  toExpenseForm,
  toExpensePayload,
} from '@/entities/expense'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Dialog, toast } from '@/shared/ui'
import { useUpdateExpense } from '../model/useUpdateExpense'

export interface EditExpenseDialogProps {
  clinicId: number
  expense: Expense
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'edit-expense-form'

export function EditExpenseDialog({
  clinicId,
  expense,
  open,
  onOpenChange,
}: EditExpenseDialogProps) {
  const { t } = useTranslation(['expenses', 'common'])

  const form = useForm<ExpenseFormInput>({
    resolver: valibotResolver(expenseFormSchema),
    mode: 'onBlur',
    defaultValues: toExpenseForm(expense),
  })

  const { reset } = form
  // `defaultValues` is read once; without this the dialog would keep the first
  // expense it was opened for, and save over that one.
  useEffect(() => {
    if (open) reset(toExpenseForm(expense))
  }, [open, expense, reset])

  const { mutate, isPending } = useUpdateExpense(clinicId)

  const doctorsQuery = useQuery(doctorQueries.list(clinicId))
  const doctorOptions = (doctorsQuery.data ?? []).map((doctor) => ({
    value: String(doctor.id),
    label: doctor.fullName,
  }))

  const handleSubmit = form.handleSubmit((values) => {
    mutate(
      { id: expense.id, payload: toExpensePayload(values) },
      {
        onSuccess: () => {
          toast.success(t('expenses:edit.success'))
          onOpenChange(false)
        },
        onError: (error) => {
          if (!(error instanceof ApiError)) {
            form.setError('root', { message: t('expenses:edit.failed') })
            return
          }

          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const first = messages[0]
            if (first === undefined) continue
            form.setError(expenseFormFieldOf(field), { message: first })
          }

          if (Object.keys(error.fieldErrors).length === 0) {
            form.setError('root', {
              message:
                error.kind === 'network' ? t('common:error.network') : t('expenses:edit.failed'),
            })
          }
        },
      },
    )
  })

  const rootError = form.formState.errors.root?.message

  return (
    <Dialog
      description={t('expenses:edit.description')}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)} variant="secondary">
            {t('common:action.cancel')}
          </Button>
          <Button form={FORM_ID} isLoading={isPending} type="submit" variant="primary">
            {t('common:action.save')}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t('expenses:edit.title')}
    >
      <form className="flex flex-col gap-4" id={FORM_ID} noValidate onSubmit={handleSubmit}>
        {rootError ? <Alert title={rootError} tone="danger" /> : null}
        <ExpenseFormFields doctorOptions={doctorOptions} form={form} isDisabled={isPending} />
      </form>
    </Dialog>
  )
}
