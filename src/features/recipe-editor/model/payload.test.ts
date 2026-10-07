import { describe, expect, it } from 'vitest'
import { MEDICATION_CATALOG } from './catalog'
import { fillFromCatalog, newMedicineRow, toMedicinePayload, toRecipePayload } from './payload'

describe('toMedicinePayload', () => {
  it('sends the codes and integers the server takes', () => {
    expect(toMedicinePayload({ ...newMedicineRow(), name: ' Amoksiklav 625 mg ' })).toEqual({
      name: 'Amoksiklav 625 mg',
      dose: 1,
      type: 'tablet',
      frequency: 'bid',
      duration: 5,
      meal: 'after',
      minutes: 30,
    })
  })

  it('stores a course in weeks as days — the server has no unit field', () => {
    const row = {
      ...newMedicineRow(),
      name: 'X',
      durationAmount: '2',
      durationUnit: 'weeks' as const,
    }
    expect(toMedicinePayload(row)?.duration).toBe(14)
  })

  it('sends 0 minutes when the timing does not depend on food', () => {
    const row = { ...newMedicineRow(), name: 'X', meal: 'with' as const, minutes: '30' }
    expect(toMedicinePayload(row)?.minutes).toBe(0)
  })

  it('treats an emptied minutes input as no offset', () => {
    expect(toMedicinePayload({ ...newMedicineRow(), name: 'X', minutes: '' })?.minutes).toBe(0)
  })

  it('refuses rather than guesses a missing dose or duration', () => {
    expect(toMedicinePayload({ ...newMedicineRow(), name: 'X', dose: '' })).toBeNull()
    expect(toMedicinePayload({ ...newMedicineRow(), name: 'X', dose: '0' })).toBeNull()
    expect(toMedicinePayload({ ...newMedicineRow(), name: 'X', durationAmount: '' })).toBeNull()
    expect(toMedicinePayload({ ...newMedicineRow(), name: '  ' })).toBeNull()
  })
})

describe('fillFromCatalog', () => {
  it('fills the whole row from the pick, keeping the row identity', () => {
    const row = newMedicineRow()
    const ketorol = MEDICATION_CATALOG.find((medicine) => medicine.name === 'Ketorol 10 mg')
    if (ketorol === undefined) throw new Error('catalog lost Ketorol')

    expect(fillFromCatalog(row, ketorol)).toEqual({
      rowId: row.rowId,
      name: 'Ketorol 10 mg',
      dose: '1',
      form: 'tablet',
      frequency: 'prn',
      meal: 'after',
      minutes: '0',
      durationAmount: '3',
      durationUnit: 'days',
    })
  })
})

describe('toRecipePayload', () => {
  it('drops unnamed rows and trims the note', () => {
    expect(
      toRecipePayload({
        patientId: 10,
        doctorId: 5,
        notes: '  Issiq ichmang ',
        rows: [newMedicineRow(), { ...newMedicineRow(), name: 'Nimesil 100 mg' }],
      }),
    ).toEqual({
      patient: 10,
      doctor: 5,
      notes: 'Issiq ichmang',
      medicines: [expect.objectContaining({ name: 'Nimesil 100 mg' })],
    })
  })
})

describe('MEDICATION_CATALOG', () => {
  it('has unique names — cmdk keys items by them', () => {
    const names = MEDICATION_CATALOG.map((medicine) => medicine.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
