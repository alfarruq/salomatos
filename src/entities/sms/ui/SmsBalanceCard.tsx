import { useTranslation } from 'react-i18next'
import { formatSom } from '@/shared/lib/money'
import { Alert, Card } from '@/shared/ui'
import type { SmsBalance } from '../model/types'

export interface SmsBalanceCardProps {
  balance: SmsBalance
}

/** The clinic's prepaid SMS balance. Read-only — topping up is not offered yet. */
export function SmsBalanceCard({ balance }: SmsBalanceCardProps) {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const currencyLabel = t('common:currency.som')

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-callout text-text-secondary">{t('admin:sms.balanceTitle')}</h2>
        <p className="text-title1 text-text tabular-nums">
          {formatSom(balance.balance, i18n.language, currencyLabel)}
        </p>
        <p className="text-callout text-text-secondary">
          {t('admin:sms.pricePerSms', {
            price: formatSom(balance.pricePerSms, i18n.language, currencyLabel),
          })}
          {' · '}
          {t('admin:sms.estimatedSms', { count: balance.estimatedSms })}
        </p>
      </div>

      {balance.estimatedSms === 0 ? (
        <Alert title={t('admin:sms.balanceEmpty')} tone="warning" />
      ) : balance.isLow ? (
        <Alert title={t('admin:sms.balanceLow')} tone="warning" />
      ) : null}
    </Card>
  )
}
