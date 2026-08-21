import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Field, Input } from '@/shared/ui'
import { type LoginInput, loginSchema } from '../model/schema'
import { useLogin } from '../model/useLogin'

/**
 * ⚠️ Temporary. Zod and the server both return translation keys (§10); i18n
 * arrives in phase 5, and this map is deleted then in favour of `t()`.
 * A key that reaches the screen unmapped is shown as-is rather than hidden, so
 * the gap is visible rather than silent.
 */
const MESSAGES: Record<string, string> = {
  'validation.required': "Bu maydon to'ldirilishi shart",
  'validation.email': "Email manzil noto'g'ri",
}

function translate(key: string | undefined): string | undefined {
  if (key === undefined) return undefined
  return MESSAGES[key] ?? key
}

export interface LoginFormProps {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    // onBlur, not onChange: validating every keystroke nags rather than helps.
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })

  const { mutate, isPending } = useLogin()

  const handleSubmit = form.handleSubmit((values) =>
    mutate(values, {
      onSuccess,
      onError: (error) => {
        if (!(error instanceof ApiError)) return

        /*
         * §10 — server validation goes back onto the fields. Without this the
         * user gets "something went wrong" and has to guess which input the
         * server objected to.
         */
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const message = messages[0]
          if (message === undefined) continue

          if (field === 'non_field_errors') {
            // DRF's shape for "these credentials do not match", which belongs
            // to the form rather than to either input.
            form.setError('root', { message })
            continue
          }
          form.setError(field as keyof LoginInput, { message })
        }

        if (Object.keys(error.fieldErrors).length === 0) {
          form.setError('root', {
            message:
              error.kind === 'network'
                ? "Serverga ulanib bo'lmadi. Internetni tekshiring."
                : (error.detail ?? 'Kirish amalga oshmadi. Qayta urinib ko`ring.'),
          })
        }
      },
    }),
  )

  const rootError = form.formState.errors.root?.message

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      {rootError ? <Alert title={translate(rootError) ?? rootError} tone="danger" /> : null}

      <Field error={translate(form.formState.errors.email?.message)} isRequired label="Email">
        <Input
          autoComplete="username"
          placeholder="siz@klinika.uz"
          type="email"
          {...form.register('email')}
        />
      </Field>

      <Field error={translate(form.formState.errors.password?.message)} isRequired label="Parol">
        <Input autoComplete="current-password" type="password" {...form.register('password')} />
      </Field>

      <Button isLoading={isPending} type="submit" variant="primary">
        Kirish
      </Button>
    </form>
  )
}
