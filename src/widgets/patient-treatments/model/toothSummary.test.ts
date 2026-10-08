import { describe, expect, it } from 'vitest'
import type { Treatment } from '@/entities/treatment'
import { summarizeTeeth } from './toothSummary'

function treatment(overrides: Partial<Treatment>): Treatment {
  return {
    id: 1,
    doctorName: null,
    treatmentTypeName: 'Plomba',
    totalTreatmentCost: null,
    totalPaid: null,
    remaining: null,
    visitNumber: null,
    toothNumber: 16,
    startDate: '2026-09-01',
    notes: null,
    status: 'completed',
    ...overrides,
  }
}

describe('summarizeTeeth', () => {
  it('keeps a tooth amber while any treatment on it is open, in either order', () => {
    const open = treatment({ id: 1, status: 'in_progress' })
    const done = treatment({ id: 2, status: 'completed' })

    expect(summarizeTeeth([open, done]).values['16']).toBe('in_progress')
    expect(summarizeTeeth([done, open]).values['16']).toBe('in_progress')
  })

  it('is green only when every treatment on the tooth is done', () => {
    const summary = summarizeTeeth([treatment({ id: 1 }), treatment({ id: 2 })])
    expect(summary.values['16']).toBe('completed')
  })

  it('counts a missing status as unfinished', () => {
    expect(summarizeTeeth([treatment({ status: null })]).values['16']).toBe('in_progress')
  })

  it('lists the real type names once each', () => {
    const summary = summarizeTeeth([
      treatment({ id: 1, treatmentTypeName: 'Эндо Тиадент' }),
      treatment({ id: 2, treatmentTypeName: 'Plomba' }),
      treatment({ id: 3, treatmentTypeName: 'Эндо Тиадент' }),
    ])
    expect(summary.names['16']).toEqual(['Эндо Тиадент', 'Plomba'])
  })

  it('picks the latest treatment by date, not by list order', () => {
    const summary = summarizeTeeth([
      treatment({ id: 5, startDate: '2026-09-10' }),
      treatment({ id: 9, startDate: '2026-08-01' }),
    ])
    expect(summary.latest['16']?.id).toBe(5)
  })

  it('skips treatments with no tooth', () => {
    expect(summarizeTeeth([treatment({ toothNumber: null })]).values).toEqual({})
  })
})
