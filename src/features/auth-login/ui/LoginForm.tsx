import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Field, Input } from '@/shared/ui'
import { type LoginInput, loginSchema } from '../model/schema'
import { useLogin } from '../model/useLogin'

export interface LoginFormProps {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { t } = useTranslation(['auth', 'validation', 'common'])

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    // onBlur, not onChange: validating every keystroke nags rather than helps.
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })

  const { mutate, isPending } = useLogin()

  /**
   * Zod returns keys like `validation.required` (§10). The server returns
   * already-translated prose, because Django localises from `Accept-Language`
   * (§12.3). So: translate if it looks like one of our keys, otherwise show it
   * as it arrived.
   */
  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    return value.startsWith('validation.') ? t(value.replace('validation.', 'validation:')) : value
  }

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
          const first = messages[0]
          if (first === undefined) continue

          if (field === 'non_field_errors') {
            // DRF's shape for "these credentials do not match", which belongs
            // to the form rather than to either input.
            form.setError('root', { message: first })
            continue
          }
          form.setError(field as keyof LoginInput, { message: first })
        }

        if (Object.keys(error.fieldErrors).length === 0) {
          form.setError('root', {
            message:
              error.kind === 'network'
                ? t('common:error.network')
                : (error.detail ?? t('auth:login.failed')),
          })
        }
      },
    }),
  )

  const rootError = form.formState.errors.root?.message

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      {rootError ? <Alert title={rootError} tone="danger" /> : null}

      <Field
        error={message(form.formState.errors.email?.message)}
        isRequired
        label={t('auth:login.email')}
      >
        <Input
          autoComplete="username"
          placeholder={t('auth:login.emailPlaceholder')}
          type="email"
          {...form.register('email')}
        />
      </Field>

      <Field
        error={message(form.formState.errors.password?.message)}
        isRequired
        label={t('auth:login.password')}
      >
        <Input autoComplete="current-password" type="password" {...form.register('password')} />
      </Field>

      <Button isLoading={isPending} type="submit" variant="primary">
        {t('auth:login.submit')}
      </Button>
    </form>
  )
}
