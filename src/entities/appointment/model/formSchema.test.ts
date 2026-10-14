import { describe, expect, it } from 'vitest'
import { emptyAppointmentForm, toAppointmentPayload } from './formSchema'

const BASE = {
  ...emptyAppointmentForm,
  fullName: 'Vali Aliyev',
  phoneNumber: '+998901234567',
  doctorId: '2',
  date: '2026-10-08',
  time: '09:30',
}

describe('toAppointmentPayload', () => {
  it('sends the treatment type and tooth as integers when picked', () => {
    const payload = toAppointmentPayload({ ...BASE, treatmentTypeId: '7', toothNumber: '16' })

    expect(payload).toMatchObject({ treatment_type: 7, tooth_number: 16 })
  })

  it('leaves both out when nothing was picked, so an edit cannot clear them', () => {
    const payload = toAppointmentPayload(BASE)

    expect(payload).not.toHaveProperty('treatment_type')
    expect(payload).not.toHaveProperty('tooth_number')
  })
})
