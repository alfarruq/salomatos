import { describe, expect, it } from 'vitest'
import type { Appointment } from '@/entities/appointment'
import { countToday, findNextAppointment, todaysQueue } from './today'

function appointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: 1,
    fullName: 'Test',
    phoneNumber: null,
    patientId: 1,
    doctorId: 4,
    doctorName: 'Doctor',
    treatmentTypeName: null,
    date: '2026-10-09',
    time: '10:00',
    notes: null,
    status: 'in_progress',
    ...overrides,
  }
}

describe('countToday', () => {
  it('splits the day into completed and remaining', () => {
    expect(
      countToday([
        appointment({ id: 1, status: 'completed' }),
        appointment({ id: 2 }),
        appointment({ id: 3 }),
      ]),
    ).toEqual({ total: 3, completed: 1, remaining: 2 })
  })

  it('is all zeros for an empty day', () => {
    expect(countToday([])).toEqual({ total: 0, completed: 0, remaining: 0 })
  })
})

describe('todaysQueue', () => {
  const rows = [
    appointment({ id: 1, time: '14:00', doctorId: 4 }),
    appointment({ id: 2, time: '09:00', doctorId: 5 }),
    appointment({ id: 3, time: '11:00', doctorId: 4, date: '2026-10-08' }),
  ]

  it("keeps only today's rows, earliest first", () => {
    expect(todaysQueue(rows, { date: '2026-10-09', doctorId: null }).map((a) => a.id)).toEqual([
      2, 1,
    ])
  })

  it("narrows to one doctor's rows", () => {
    expect(todaysQueue(rows, { date: '2026-10-09', doctorId: 4 }).map((a) => a.id)).toEqual([1])
  })
})

describe('findNextAppointment', () => {
  const queue = [
    appointment({ id: 1, time: '09:00' }),
    appointment({ id: 2, time: '10:00', status: 'completed' }),
    appointment({ id: 3, time: '11:00' }),
  ]

  it('skips past and completed appointments', () => {
    expect(findNextAppointment(queue, '09:30')?.id).toBe(3)
  })

  it('counts an appointment due this very minute as next', () => {
    expect(findNextAppointment(queue, '09:00')?.id).toBe(1)
  })

  it('is null once nothing open is left', () => {
    expect(findNextAppointment(queue, '12:00')).toBeNull()
  })
})
