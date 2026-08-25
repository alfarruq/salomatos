import { valibotResolver } from '@hookform/resolvers/valibot'
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
    resolver: valibotResolver(loginSchema),
    // onBlur, not onChange: validating every keystroke nags rather than helps.
    mode: 'onBlur',
    defaultValues: { username: '', password: '' },
  })

  const { mutate, isPending } = useLogin()

  /**
   * Both Valibot and the server now speak the same dialect: `validation.<code>`
   * (§10 and `normalizeDrfError`). Anything else is prose from somewhere we do
   * not control and is shown as it arrived.
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
          form.setError(field as keyof LoginInput, { message: first })
        }

        if (Object.keys(error.fieldErrors).length > 0) return

        /*
         * Nothing field-specific — a wrong password arrives as a `message_key`
         * with empty `errors`. The key is translated when we recognise it; the
         * server's own prose is only a fallback, because Django renders it with
         * `LANGUAGE_CODE = "en-us"` and never reads `Accept-Language`, so it is
         * English regardless of the four locales this interface offers.
         */
        form.setError('root', {
          message:
            error.kind === 'network'
              ? t('common:error.network')
              : t(`auth:serverError.${error.messageKey ?? 'unknown'}`, {
                  defaultValue: error.detail ?? t('auth:login.failed'),
                }),
        })
      },
    }),
  )

  const rootError = form.formState.errors.root?.message

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      {rootError ? <Alert title={rootError} tone="danger" /> : null}

      <Field
        error={message(form.formState.errors.username?.message)}
        isRequired
        label={t('auth:login.username')}
      >
        <Input
          autoComplete="username"
          placeholder={t('auth:login.usernamePlaceholder')}
          {...form.register('username')}
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
