import { describe, expect, it } from 'vitest'
import { toExistingTreatmentPayload, toNewTreatmentPayload } from './formSchema'
import type { ComposerFields, TreatmentRow } from './types'

const fields: ComposerFields = { doctorId: '7', notes: 'Izoh' }

const newRow: TreatmentRow = {
  rowId: 'row-1',
  toothNumber: 16,
  treatmentTypeId: 9,
  treatmentTypeName: 'Implantatsiya',
  totalCost: '1,200,000',
  totalPaid: '500000',
  status: 'in_progress',
  initialStatus: null,
  existingTreatmentId: null,
}

describe('toNewTreatmentPayload', () => {
  it('builds the full array-entry shape confirmed against the real contract', () => {
    expect(
      toNewTreatmentPayload(newRow, fields, {
        patientId: 101,
        startDate: '2026-10-05',
        visitNumber: 4,
        today: '2026-10-07',
      }),
    ).toEqual({
      patient: 101,
      doctor: 7,
      treatment_type: 9,
      total_treatment_cost: 1_200_000,
      total_paid: 500_000,
      // Required: the live endpoint answers 400 without it.
      visit_number: 4,
      tooth_number: 16,
      start_date: '2026-10-05',
      completed_date: null,
      notes: 'Izoh',
      status: 'in_progress',
    })
  })

  it('sends tooth_number as an explicit null for a non-dental row, not omitted', () => {
    const payload = toNewTreatmentPayload({ ...newRow, toothNumber: null }, fields, {
      patientId: 101,
      startDate: '2026-10-05',
      visitNumber: 4,
      today: '2026-10-07',
    })
    expect(payload).toHaveProperty('tooth_number', null)
  })

  it('refuses a row with no treatment type — nothing to send', () => {
    const row = { ...newRow, treatmentTypeId: null }
    expect(
      toNewTreatmentPayload(row, fields, {
        patientId: 101,
        startDate: '2026-10-05',
        visitNumber: 4,
        today: '2026-10-07',
      }),
    ).toBeNull()
  })

  it('refuses when the doctor was never actually selected', () => {
    expect(
      toNewTreatmentPayload(
        newRow,
        { ...fields, doctorId: '' },
        {
          patientId: 101,
          startDate: '2026-10-05',
          visitNumber: 4,
          today: '2026-10-07',
        },
      ),
    ).toBeNull()
  })

  it("takes each row's own status, so one save can mix finished and ongoing teeth", () => {
    const context = { patientId: 101, startDate: '2026-10-05', visitNumber: 4, today: '2026-10-07' }
    const done = toNewTreatmentPayload({ ...newRow, status: 'completed' }, fields, context)
    const ongoing = toNewTreatmentPayload(newRow, fields, context)

    expect(done?.status).toBe('completed')
    expect(ongoing?.status).toBe('in_progress')
  })

  it('dates a row completed on creation to the clinic today', () => {
    const context = { patientId: 101, startDate: '2026-10-05', visitNumber: 4, today: '2026-10-07' }
    expect(
      toNewTreatmentPayload({ ...newRow, status: 'completed' }, fields, context)?.completed_date,
    ).toBe('2026-10-07')
    expect(toNewTreatmentPayload(newRow, fields, context)?.completed_date).toBeNull()
  })

  it('treats an unset money field as zero, not NaN', () => {
    const row = { ...newRow, totalCost: '', totalPaid: '' }
    const payload = toNewTreatmentPayload(row, fields, {
      patientId: 101,
      startDate: '2026-10-05',
      visitNumber: 4,
      today: '2026-10-07',
    })
    expect(payload?.total_treatment_cost).toBe(0)
    expect(payload?.total_paid).toBe(0)
  })
})

describe('toExistingTreatmentPayload', () => {
  const existingRow: TreatmentRow = {
    ...newRow,
    initialStatus: 'in_progress',
    existingTreatmentId: 55,
  }
  const dates = { startDate: '2026-10-05', today: '2026-10-07' }

  it('dates the save that completes the treatment, and only that one', () => {
    const completing = toExistingTreatmentPayload(
      { ...existingRow, status: 'completed' },
      fields,
      { doctor: false, treatmentType: false },
      dates,
    )
    expect(completing.completed_date).toBe('2026-10-07')

    const alreadyDone = toExistingTreatmentPayload(
      { ...existingRow, status: 'completed', initialStatus: 'completed' },
      fields,
      { doctor: false, treatmentType: false },
      dates,
    )
    expect(alreadyDone).not.toHaveProperty('completed_date')
  })

  it('never dates a completion before the treatment started', () => {
    const payload = toExistingTreatmentPayload(
      { ...existingRow, status: 'completed' },
      fields,
      { doctor: false, treatmentType: false },
      { startDate: '2026-10-09', today: '2026-10-07' },
    )
    expect(payload.completed_date).toBe('2026-10-09')
  })

  it('omits doctor and treatment_type when neither select was touched', () => {
    const payload = toExistingTreatmentPayload(
      existingRow,
      fields,
      {
        doctor: false,
        treatmentType: false,
      },
      dates,
    )

    expect(payload).toEqual({
      total_treatment_cost: 1_200_000,
      total_paid: 500_000,
      notes: 'Izoh',
      status: 'in_progress',
    })
  })

  it('includes doctor only once the select was actually touched', () => {
    const payload = toExistingTreatmentPayload(
      existingRow,
      fields,
      {
        doctor: true,
        treatmentType: false,
      },
      dates,
    )

    expect(payload.doctor).toBe(7)
    expect(payload).not.toHaveProperty('treatment_type')
  })

  it('includes treatment_type only once that select was touched', () => {
    const payload = toExistingTreatmentPayload(
      existingRow,
      fields,
      {
        doctor: false,
        treatmentType: true,
      },
      dates,
    )

    expect(payload.treatment_type).toBe(9)
    expect(payload).not.toHaveProperty('doctor')
  })

  it('never sends patient, tooth_number, start_date or visit_number — nothing here can change them', () => {
    const payload = toExistingTreatmentPayload(
      existingRow,
      fields,
      {
        doctor: true,
        treatmentType: true,
      },
      dates,
    )

    expect(payload).not.toHaveProperty('patient')
    expect(payload).not.toHaveProperty('tooth_number')
    expect(payload).not.toHaveProperty('start_date')
    expect(payload).not.toHaveProperty('visit_number')
  })
})
