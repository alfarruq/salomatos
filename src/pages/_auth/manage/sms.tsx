import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SmsBalanceCard, smsQueries } from '@/entities/sms'
import { SmsSettingsForm } from '@/features/sms-settings-update'
import { ApiError } from '@/shared/api/errors'
import { Card, EmptyState, ErrorState, QueryBoundary, Skeleton } from '@/shared/ui'

export const Route = createFileRoute('/_auth/manage/sms')({
  component: SmsSection,
})

/**
 * Appointment reminders by SMS, paid from the clinic's own balance.
 *
 * Only date, time and the clinic's name and phone go into a message — the
 * template is fixed on the server, so no patient name or diagnosis can reach
 * the SMS provider or a lock screen (§3).
 */
function SmsSection() {
  const { t } = useTranslation(['admin', 'common'])
  // Set by the `_auth` guard, which resolved the session before this rendered.
  const { clinicId } = Route.useRouteContext()

  const settingsQuery = useQuery(smsQueries.settings(clinicId))
  const balanceQuery = useQuery(smsQueries.balance(clinicId))

  const pageError = ({ retry }: { retry: (() => void) | undefined }) => (
    <ErrorState
      description={t('common:error.pageBody')}
      retryLabel={t('common:action.retry')}
      title={t('common:error.pageTitle')}
      {...(retry === undefined ? {} : { onRetry: retry })}
    />
  )

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <QueryBoundary
        /*
         * A 404 means the backend has not shipped the SMS endpoints yet, not
         * that something broke. The settings card below says so once.
         */
        error={({ error, retry }) =>
          error instanceof ApiError && error.kind === 'notFound' ? null : pageError({ retry })
        }
        loading={
          <Card className="flex flex-col gap-2 p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </Card>
        }
        query={balanceQuery}
      >
        {(balance) => <SmsBalanceCard balance={balance} />}
      </QueryBoundary>

      <QueryBoundary
        error={({ error, retry }) =>
          error instanceof ApiError && error.kind === 'notFound' ? (
            <EmptyState
              description={t('admin:sms.unavailableDescription')}
              icon={<MessageSquare aria-hidden="true" className="size-8" />}
              title={t('admin:sms.unavailable')}
            />
          ) : (
            pageError({ retry })
          )
        }
        loading={
          <Card className="flex flex-col gap-4 p-6">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </Card>
        }
        query={settingsQuery}
      >
        {(settings) => <SmsSettingsForm clinicId={clinicId} settings={settings} />}
      </QueryBoundary>
    </div>
  )
}
