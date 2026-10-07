import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/shared/lib/datetime'
import { Card, EmptyState, ErrorState, QueryBoundary, Skeleton } from '@/shared/ui'
import { recipeQueries } from '../api/queries'
import type { Medicine, Recipe } from '../model/types'

export interface PrescriptionListProps {
  clinicId: number
  patientId: number
}

/** Shown when the server had nothing to send for a field. */
const EMPTY = '—'

/**
 * The patient's prescriptions — `/core/recipes/`. Cards rather than a table:
 * a prescription is closer to a short document (notes plus a list of
 * medicines) than to a row of comparable figures, so §13's density rule does
 * not apply the way it does to the treatment history.
 */
export function PrescriptionList({ clinicId, patientId }: PrescriptionListProps) {
  const { t } = useTranslation(['patients', 'common'])
  const query = useQuery(recipeQueries.list(clinicId, patientId))

  return (
    <QueryBoundary
      empty={
        <EmptyState
          description={t('patients:detail.prescriptionsEmptyDescription')}
          title={t('patients:detail.prescriptionsEmpty')}
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
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
      query={query}
    >
      {(recipes) => (
        <div className="flex flex-col gap-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </QueryBoundary>
  )
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { i18n } = useTranslation('patients')

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-callout font-medium text-text">{recipe.doctorName ?? EMPTY}</span>
        {recipe.createdAt === null ? null : (
          <span className="text-caption text-text-tertiary">
            {formatDate(recipe.createdAt, { locale: i18n.language })}
          </span>
        )}
      </div>

      {recipe.notes === null ? null : <p className="text-callout text-text">{recipe.notes}</p>}

      {recipe.medicines.length === 0 ? null : (
        <ul className="flex flex-col gap-1 border-t border-border pt-3">
          {recipe.medicines.map((medicine) => (
            <li className="text-caption text-text-secondary" key={medicine.id}>
              {medicineLine(medicine)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/**
 * `dose`, `frequency`, `duration` and `meal` are free-text fields the server
 * already renders for a person (e.g. `"1 tablet"`, `"2 times a day"`) rather
 * than codes this client could translate — joined as sent, like the rest of
 * the prescription's own wording.
 */
function medicineLine(medicine: Medicine): string {
  const parts = [
    medicine.name ?? EMPTY,
    medicine.dose,
    medicine.frequency,
    medicine.duration,
    medicine.meal,
  ]
  return parts.filter((part) => part !== null && part !== '').join(' · ')
}
