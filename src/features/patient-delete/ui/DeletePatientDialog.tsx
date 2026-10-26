import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Patient } from '@/entities/patient'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Dialog } from '@/shared/ui'
import { useDeletePatient } from '../model/useDeletePatient'

export interface DeletePatientDialogProps {
  clinicId: number
  /** A `Pick`, not the full `Patient` — the table passes a `PatientListItem` row directly. */
  patient: Pick<Patient, 'id' | 'fullName'>
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful delete — the caller navigates away from a record that no longer exists. */
  onDeleted: () => void
}

const CONFIRM_DELAY_SECONDS = 10

/**
 * The heaviest delete in the app: unlike a service or a doctor type, a
 * patient carries real treatment, appointment and billing history behind it.
 * Nothing on this client confirms what happens to that history on delete —
 * the warning and the delay are the mitigation available at this layer, not
 * a substitute for confirming the actual backend behaviour.
 */
export function DeletePatientDialog({
  clinicId,
  patient,
  open,
  onOpenChange,
  onDeleted,
}: DeletePatientDialogProps) {
  const { t } = useTranslation(['patients', 'common'])
  const { mutate, isPending, error, reset } = useDeletePatient(clinicId)
  const [secondsLeft, setSecondsLeft] = useState(CONFIRM_DELAY_SECONDS)

  // Restarts every time the dialog opens, so re-opening it (for the same or a
  // different patient) cannot inherit an already-elapsed delay.
  useEffect(() => {
    if (!open) return

    setSecondsLeft(CONFIRM_DELAY_SECONDS)
    const timer = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [open])

  /*
   * Specific on purpose: a bare "could not delete" left the user with no way
   * to tell a missing permission from a server refusal. The status code is
   * there so a screenshot is enough to know which one it was.
   */
  const errorMessage =
    error === null
      ? null
      : !(error instanceof ApiError) || error.kind === 'network'
        ? t('common:error.network')
        : error.kind === 'forbidden'
          ? t('patients:delete.forbidden')
          : t('patients:delete.failedWithCode', { status: error.status ?? '—' })

  const canConfirm = secondsLeft <= 0

  return (
    <Dialog
      description={t('patients:delete.description', { name: patient.fullName })}
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
            onClick={() =>
              mutate(patient.id, {
                onSuccess: onDeleted,
                // Already gone (deleted from another tab or device): the goal
                // is met, so leave the page rather than report a failure.
                onError: (deleteError) => {
                  if (deleteError instanceof ApiError && deleteError.kind === 'notFound') {
                    onDeleted()
                  }
                },
              })
            }
            variant="danger"
          >
            {canConfirm
              ? t('common:action.delete')
              : t('patients:delete.wait', { seconds: secondsLeft })}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t('patients:delete.title')}
    >
      <div className="flex flex-col gap-3">
        <Alert title={t('patients:delete.warning')} tone="warning" />
        {errorMessage === null ? null : <Alert title={errorMessage} tone="danger" />}
      </div>
    </Dialog>
  )
}
