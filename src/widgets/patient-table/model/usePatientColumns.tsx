import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PatientListItem } from '@/entities/patient'
import { PatientAvatar, PatientStatusBadge } from '@/entities/patient'
import { formatCalendarDate } from '@/shared/lib/calendarDate'
import { formatSom } from '@/shared/lib/money'
import { formatSubscriber, subscriberDigitsOf } from '@/shared/ui'

/**
 * Column alignment, carried on the column rather than repeated at every cell.
 * TanStack types `meta` as empty until a consumer declares its shape.
 */
declare module '@tanstack/react-table' {
  // biome-ignore lint/correctness/noUnusedVariables: TData and TValue are required by the interface being augmented
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'right'
  }
}

const column = createColumnHelper<PatientListItem>()

/** Shown when the server had nothing to send for a cell. */
const EMPTY = '—'

/**
 * The patient list's columns.
 *
 * A hook because every header and several cells need `t`, and the language can
 * change without a remount. Memoised on the language so the table is not
 * rebuilt on every render.
 */
export function usePatientColumns() {
  const { t, i18n } = useTranslation('patients')
  const locale = i18n.language

  return useMemo(
    () => [
      column.accessor('fullName', {
        header: () => t('column.fullName'),
        cell: (info) => (
          <div className="flex items-center gap-2">
            <PatientAvatar name={info.getValue()} size="sm" />
            <span className="text-text">{info.getValue()}</span>
          </div>
        ),
      }),

      column.accessor('phoneNumber', {
        header: () => t('column.phoneNumber'),
        cell: (info) => {
          const value = info.getValue()
          if (value === null) return EMPTY
          // Same grouping the input uses, so a number reads identically
          // wherever staff meet it.
          return `+998 ${formatSubscriber(subscriberDigitsOf(value))}`
        },
      }),

      column.accessor('status', {
        header: () => t('column.status'),
        cell: (info) => <PatientStatusBadge status={info.getValue()} />,
      }),

      column.accessor('doctorName', {
        header: () => t('column.doctor'),
        // A name with no id behind it — the serializer sends no doctor id, so
        // this cannot become a link until it does.
        cell: (info) => info.getValue() ?? EMPTY,
      }),

      column.accessor('lastAppointment', {
        header: () => t('column.lastAppointment'),
        cell: (info) => {
          const slot = info.getValue()
          if (slot === null) return EMPTY

          const date = formatCalendarDate(slot.date, locale)
          return date === null ? EMPTY : `${date}, ${slot.time}`
        },
      }),

      column.accessor('totalRemaining', {
        header: () => t('column.remaining'),
        // Money right-aligns so the digits line up down the column; §13's
        // density guidance is about scanning, and this is what makes a
        // financial column scannable.
        meta: { align: 'right' },
        cell: (info) => formatSom(info.getValue(), locale),
      }),
    ],
    [t, locale],
  )
}
