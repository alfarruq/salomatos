import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TreatmentType } from '@/entities/treatment-type'
import { treatmentTypeQueries } from '@/entities/treatment-type'
import { CreateTreatmentTypeDialog } from '@/features/treatment-type-create'
import { EditTreatmentTypeDialog } from '@/features/treatment-type-edit'
import { formatSom } from '@/shared/lib/money'
import {
  Button,
  EmptyState,
  ErrorState,
  QueryBoundary,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/shared/ui'

export interface TreatmentTypeTableProps {
  clinicId: number
}

/**
 * The clinic's services and prices.
 *
 * No pagination and no search: the endpoint returns a plain array and a price
 * list is tens of rows, not thousands.
 */
export function TreatmentTypeTable({ clinicId }: TreatmentTypeTableProps) {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<TreatmentType | null>(null)

  const query = useQuery(treatmentTypeQueries.list(clinicId))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-callout text-text-secondary">{t('admin:service.description')}</p>
        <Button onClick={() => setCreateOpen(true)} size="sm" variant="primary">
          {t('admin:service.create')}
        </Button>
      </div>

      <QueryBoundary
        empty={
          <EmptyState
            action={
              <Button onClick={() => setCreateOpen(true)} variant="primary">
                {t('admin:service.create')}
              </Button>
            }
            description={t('admin:service.emptyDescription')}
            title={t('admin:service.empty')}
          />
        }
        error={({ retry }) => (
          <ErrorState
            description={t('common:error.pageBody')}
            retryLabel={t('common:action.retry')}
            title={t('common:error.pageTitle')}
            {...(retry === undefined ? {} : { onRetry: retry })}
          />
        )}
        loading={
          <Table density="compact">
            <TableSkeleton columns={3} rows={5} />
          </Table>
        }
        query={query}
      >
        {(services) => (
          <Table density="compact">
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin:service.name')}</TableHead>
                <TableHead align="right">{t('admin:service.price')}</TableHead>
                <TableHead align="right">{t('common:action.edit')}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.name}</TableCell>
                  <TableCell align="right">
                    {/* No price is a real state, not a zero — some work is
                        quoted per case. */}
                    {service.price === null
                      ? t('admin:service.noPrice')
                      : formatSom(service.price, i18n.language)}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      aria-label={`${t('common:action.edit')} — ${service.name}`}
                      onClick={() => setEditing(service)}
                      size="sm"
                      variant="ghost"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryBoundary>

      <CreateTreatmentTypeDialog
        clinicId={clinicId}
        onOpenChange={setCreateOpen}
        open={isCreateOpen}
      />

      {editing === null ? null : (
        <EditTreatmentTypeDialog
          clinicId={clinicId}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          open
          service={editing}
        />
      )}
    </div>
  )
}
