import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { MOCK_PATIENTS } from '@/shared/api/mocks/fixtures'
import { parseFormattedAppointment, patientListItemSchema, toPatientListItem } from './schema'

describe('parseFormattedAppointment', () => {
  it('recovers the parts the serializer already formatted away', () => {
    expect(parseFormattedAppointment('24.08.2026 14:30')).toEqual({
      date: '2026-08-24',
      time: '14:30',
    })
  })

  it('returns null for a patient who has never been booked', () => {
    expect(parseFormattedAppointment(null)).toBeNull()
  })

  it('refuses a day that does not exist instead of rolling it forward', () => {
    /*
     * §12.4's trap, one layer down: `new Date(2026, 1, 31)` silently becomes
     * 3 March. A patient card showing an appointment on a day the clinic never
     * offered is worse than showing nothing.
     */
    expect(parseFormattedAppointment('31.02.2026 09:00')).toBeNull()
  })

  it('refuses an impossible time', () => {
    expect(parseFormattedAppointment('24.08.2026 25:00')).toBeNull()
    expect(parseFormattedAppointment('24.08.2026 14:75')).toBeNull()
  })

  it('refuses anything that is not the format the backend emits', () => {
    // If `get_appointment_date` ever changes, this should go quiet rather than
    // guess at a new shape.
    expect(parseFormattedAppointment('2026-08-24T14:30:00Z')).toBeNull()
    expect(parseFormattedAppointment('24.8.2026 14:30')).toBeNull()
    expect(parseFormattedAppointment('')).toBeNull()
  })
})

describe('toPatientListItem', () => {
  it('maps the wire row to the domain row', () => {
    const item = toPatientListItem(MOCK_PATIENTS[0])

    expect(item.id).toBe(101)
    expect(item.fullName).toBe('Vali Aliyev')
    expect(item.doctorName).toBe('Sardor Usmonov')
    expect(item.status).toBe('in_progress')
    expect(item.lastAppointment).toEqual({ date: '2026-08-24', time: '14:30' })
  })

  it('carries a patient with nothing on record through without inventing values', () => {
    // Every optional field null: no treatment, no doctor, no appointment.
    const item = toPatientListItem(MOCK_PATIENTS[2])

    expect(item.status).toBeNull()
    expect(item.doctorName).toBeNull()
    expect(item.lastAppointment).toBeNull()
    expect(item.remaining).toBeNull()
    // Not null — the aggregate defaults to 0 on the server.
    expect(item.totalRemaining).toBe(0)
  })

  it('renders a row from the two fields it cannot do without', () => {
    /*
     * Strictness is spent on `id` and `full_name`; everything else may be
     * absent. A serializer that stops sending `office` should not empty a
     * clinic's patient table.
     */
    const item = toPatientListItem(
      v.parse(patientListItemSchema, { id: 7, full_name: 'Nodira Karimova' }),
    )

    expect(item.id).toBe(7)
    expect(item.fullName).toBe('Nodira Karimova')
    expect(item.phoneNumber).toBeNull()
    expect(item.totalRemaining).toBe(0)
  })

  it('takes a figure whichever way the server types it', () => {
    /*
     * drf-yasg types every SerializerMethodField `string`; the Python returns
     * integers. The schema cannot say which is right, so the row survives
     * either — betting on one and losing means the table does not render.
     */
    const asNumber = toPatientListItem(
      v.parse(patientListItemSchema, { id: 1, full_name: 'A', total_remaining: 1200000 }),
    )
    const asString = toPatientListItem(
      v.parse(patientListItemSchema, { id: 1, full_name: 'A', total_remaining: '1200000' }),
    )

    expect(asNumber.totalRemaining).toBe(1_200_000)
    expect(asString.totalRemaining).toBe(1_200_000)
  })

  it('shows a dash rather than NaN for a figure it cannot read', () => {
    const item = toPatientListItem(
      v.parse(patientListItemSchema, { id: 1, full_name: 'A', remaining: 'not a number' }),
    )

    // null renders as "—"; NaN would reach the currency formatter and print
    // something that looks like a real amount.
    expect(item.remaining).toBeNull()
  })

  it('ignores a treatment status it does not recognise', () => {
    // A third TextChoices member is a server migration, not a reason to refuse
    // to draw the table.
    const item = toPatientListItem(
      v.parse(patientListItemSchema, {
        id: 7,
        full_name: 'Nodira Karimova',
        status: 'on_hold',
      }),
    )

    expect(item.status).toBeNull()
  })

  it('drops a birth date the backend should not have sent', () => {
    const item = toPatientListItem({ ...MOCK_PATIENTS[0], birth_date: '1988-02-31' })

    expect(item.birthDate).toBeNull()
  })
})
