import { Lock } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/shared/api/errors'
import { Alert, Avatar, Button, Card, Field, Input } from '@/shared/ui'
import { useLockStore } from '../model/lockStore'
import { useUnlock } from '../model/useUnlock'

export interface LockScreenProps {
  /** Signs out instead of unlocking — for when someone else needs the machine. */
  onSignOut: () => void
}

/**
 * Covers the whole viewport once the idle timer fires.
 *
 * The cache is already empty by the time this renders, so the screens
 * underneath have nothing on them; this is what the user interacts with, not
 * what does the protecting.
 */
export function LockScreen({ onSignOut }: LockScreenProps) {
  const email = useLockStore((state) => state.lockedEmail)
  const name = useLockStore((state) => state.lockedName)
  const { mutate: unlock, isPending } = useUnlock()

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Focus straight into the field: the user is coming back to a machine they
  // expect to keep using, and should not have to hunt for the input.
  useEffect(() => {
    passwordRef.current?.focus()
  }, [])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (email === null) return

    setError(null)
    unlock(
      { email, password },
      {
        onError: (cause) => {
          setPassword('')
          passwordRef.current?.focus()
          setError(
            cause instanceof ApiError && cause.kind === 'validation'
              ? "Parol noto'g'ri"
              : "Ulanib bo'lmadi. Qayta urinib ko'ring.",
          )
        },
      },
    )
  }

  return (
    // Not a `<dialog>` or a Radix modal: those trap focus inside an app the
    // user is locked out of. This replaces the page rather than layering on it.
    <div
      aria-label="Ekran qulflangan"
      className="fixed inset-0 z-100 flex items-center justify-center bg-canvas p-4"
      role="dialog"
    >
      <Card className="flex w-full max-w-sm flex-col gap-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          {name === null ? (
            <Lock aria-hidden="true" className="size-8 text-text-tertiary" />
          ) : (
            <Avatar name={name} size="lg" />
          )}
          <div className="flex flex-col gap-1">
            <h1 className="text-title2 text-text">Ekran qulflangan</h1>
            <p className="text-callout text-text-secondary">
              {name ?? email} · davom etish uchun parolni kiriting
            </p>
          </div>
        </div>

        {error === null ? null : <Alert title={error} tone="danger" />}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="Parol">
            <Input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              ref={passwordRef}
              type="password"
              value={password}
            />
          </Field>

          <Button isLoading={isPending} type="submit" variant="primary">
            Qulfni ochish
          </Button>
        </form>

        <Button onClick={onSignOut} variant="ghost">
          Boshqa foydalanuvchi
        </Button>
      </Card>
    </div>
  )
}
