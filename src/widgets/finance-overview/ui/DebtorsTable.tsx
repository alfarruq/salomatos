import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { FinanceDebtor } from '@/entities/finance'
import { formatFixedDate } from '@/shared/lib/calendarDate'
import { formatSom } from '@/shared/lib/money'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui'

/** Shown when the server had nothing to send for a cell. */
const EMPTY = '—'

export interface DebtorsTableProps {
  debtors: readonly FinanceDebtor[]
  /** Off while the rows are invented: their ids could belong to a real patient. */
  linkToPatients: boolean
}

/**
 * The largest debts. ⚠️ PHI on screen: names next to money. Nothing here goes
 * into the URL except a patient's numeric id on the card link (§3).
 */
export function DebtorsTable({ debtors, linkToPatients }: DebtorsTableProps) {
  const { t, i18n } = useTranslation('finance')
  const navigate = useNavigate()
  const money = (amount: number) => formatSom(amount, i18n.language, t('common:currency.som'))

  const open = (patientId: number) =>
    void navigate({ to: '/patients/$patientId', params: { patientId: String(patientId) } })

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('debtors.patient')}</TableHead>
            <TableHead className="max-sm:hidden">{t('debtors.doctor')}</TableHead>
            <TableHead className="max-sm:hidden">{t('debtors.lastPayment')}</TableHead>
            <TableHead align="right">{t('debtors.debt')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debtors.map((debtor) => (
            <TableRow
              isInteractive={linkToPatients}
              key={debtor.patientId}
              {...(linkToPatients ? { onClick: () => open(debtor.patientId) } : {})}
            >
              <TableCell>
                {/* The keyboard path to the patient; the row click is the mouse's. */}
                {linkToPatients ? (
                  <Link
                    className="font-medium text-text hover:underline focus-visible:underline"
                    onClick={(event) => event.stopPropagation()}
                    params={{ patientId: String(debtor.patientId) }}
                    to="/patients/$patientId"
                  >
                    {debtor.patientName}
                  </Link>
                ) : (
                  <span className="font-medium text-text">{debtor.patientName}</span>
                )}
              </TableCell>
              <TableCell className="max-sm:hidden">{debtor.doctorName ?? EMPTY}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums max-sm:hidden">
                {debtor.lastPaymentDate === null
                  ? t('debtors.never')
                  : formatFixedDate(debtor.lastPaymentDate)}
              </TableCell>
              <TableCell align="right" className="font-semibold text-danger" isNumeric>
                {money(debtor.debt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
