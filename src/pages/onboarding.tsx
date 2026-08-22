import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLogout } from '@/features/auth-logout'
import { Button, EmptyState } from '@/shared/ui'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

/**
 * Where `_auth` sends a signed-in user who belongs to no clinic yet — a real
 * state in a multi-tenant product, not an error. Showing an empty dashboard
 * instead would look broken.
 */
function OnboardingPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const { mutate: logout } = useLogout()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <EmptyState
        action={
          <Button
            onClick={() => logout(undefined, { onSettled: () => navigate({ to: '/login' }) })}
          >
            {t('onboarding.switchAccount')}
          </Button>
        }
        headingLevel={1}
        description={t('onboarding.body')}
        icon={<Building2 aria-hidden="true" className="size-8" />}
        title={t('onboarding.title')}
      />
    </main>
  )
}
