import type { Treatment, TreatmentStatus } from '@/entities/treatment'

export interface ToothSummary {
  /** FDI → colour status. */
  values: Record<string, TreatmentStatus>
  /** FDI → the treatment types done on it, real backend names, no repeats. */
  names: Record<string, string[]>
  /** FDI → that tooth's most recent treatment, opened on click. */
  latest: Record<string, Treatment>
}

/** Later start date wins; on a tie (or no date) the newer record, by id. */
function isNewer(candidate: Treatment, current: Treatment): boolean {
  const a = candidate.startDate ?? ''
  const b = current.startDate ?? ''
  if (a !== b) return a > b // ISO calendar dates compare correctly as strings
  return candidate.id > current.id
}

/**
 * One pass over the treatments, building all three maps.
 *
 * "In progress" dominates: one unfinished treatment keeps the tooth amber,
 * whatever order the server lists them in. A missing status counts as
 * unfinished — green has to mean the clinic recorded every one as done.
 */
export function summarizeTeeth(treatments: readonly Treatment[]): ToothSummary {
  const values: Record<string, TreatmentStatus> = {}
  const names: Record<string, string[]> = {}
  const latest: Record<string, Treatment> = {}

  for (const treatment of treatments) {
    if (treatment.toothNumber === null) continue
    const tooth = String(treatment.toothNumber)

    if (values[tooth] !== 'in_progress') {
      values[tooth] = treatment.status === 'completed' ? 'completed' : 'in_progress'
    }

    const label = treatment.treatmentTypeName
    if (label !== null && label !== '') {
      const list = names[tooth] ?? []
      if (!list.includes(label)) list.push(label)
      names[tooth] = list
    }

    const existing = latest[tooth]
    if (existing === undefined || isNewer(treatment, existing)) latest[tooth] = treatment
  }

  return { values, names, latest }
}
