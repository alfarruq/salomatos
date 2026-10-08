import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { recipeListSchema, toRecipe } from '../model/schema'
import type { Recipe } from '../model/types'

/**
 * §6.2: `clinicId` is inside every key even though the request is scoped by
 * `patient_id`, not by clinic — see `entities/treatment`'s identical key for
 * why the id still has to be here.
 */
export const recipeKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'recipes'] as const,

  list: (clinicId: number, patientId: number) =>
    [...recipeKeys.scope(clinicId), 'list', patientId] as const,
}

export async function fetchRecipes(patientId: number, signal?: AbortSignal): Promise<Recipe[]> {
  const raw = await httpClient<unknown>(
    `v1/core/recipes/?patient_id=${patientId}`,
    signal === undefined ? {} : { signal },
  )
  return v.parse(recipeListSchema, raw).map(toRecipe)
}

export const recipeQueries = {
  list: (clinicId: number, patientId: number) =>
    queryOptions({
      queryKey: recipeKeys.list(clinicId, patientId),
      queryFn: ({ signal }) => fetchRecipes(patientId, signal),
      ...cachePolicy.standard,
    }),
}
