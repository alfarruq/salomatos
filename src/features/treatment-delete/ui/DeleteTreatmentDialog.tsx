import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Treatment } from '@/entities/treatment'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Dialog } from '@/shared/ui'
import { useDeleteTreatment } from '../model/useDeleteTreatment'

export interface DeleteTreatmentDialogProps {
  clinicId: number
  treatment: Pick<Treatment, 'id' | 'treatmentTypeName' | 'toothNumber'>
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

/** Same delay as the patient and service deletes: this row carries money too. */
const CONFIRM_DELAY_SECONDS = 10

export function DeleteTreatmentDialog({
  clinicId,
  treatment,
  open,
  onOpenChange,
  onDeleted,
}: DeleteTreatmentDialogProps) {
  const { t } = useTranslation(['treatments', 'common'])
  const { mutate, isPending, error, reset } = useDeleteTreatment(clinicId)
  const [secondsLeft, setSecondsLeft] = useState(CONFIRM_DELAY_SECONDS)

  // Restarts on every open, so a re-open cannot inherit an elapsed delay.
  useEffect(() => {
    if (!open) return

    setSecondsLeft(CONFIRM_DELAY_SECONDS)
    const timer = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [open])

  const errorMessage =
    error === null
      ? null
      : error instanceof ApiError && error.kind === 'network'
        ? t('common:error.network')
        : t('treatments:delete.failed')

  const canConfirm = secondsLeft <= 0

  return (
    <Dialog
      description={t('treatments:delete.description', {
        type: treatment.treatmentTypeName ?? '—',
        tooth: treatment.toothNumber ?? '—',
      })}
      footer={
        <>
          <Button
            disabled={isPending}
            onClick={() => {
              reset()
              onOpenChange(false)
            }}
            variant="secondary"
          >
            {t('common:action.cancel')}
          </Button>
          <Button
            disabled={!canConfirm}
            isLoading={isPending}
            onClick={() => mutate(treatment.id, { onSuccess: onDeleted })}
            variant="danger"
          >
            {canConfirm
              ? t('common:action.delete')
              : t('treatments:delete.wait', { seconds: secondsLeft })}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t('treatments:delete.title')}
    >
      <div className="flex flex-col gap-3">
        <Alert title={t('treatments:delete.warning')} tone="warning" />
        {errorMessage === null ? null : <Alert title={errorMessage} tone="danger" />}
      </div>
    </Dialog>
  )
}
