import * as v from 'valibot'
import type { FinanceOverview, FinanceTotals } from './types'

/**
 * Wire contract of `GET /api/v1/finance/overview/?from=YYYY-MM-DD&to=YYYY-MM-DD`.
 * "Collected" comes from the backend's payment ledger. The server refuses
 * this endpoint to everyone but the owner; the frontend gate is UX only (§3).
 */
const som = v.pipe(v.number(), v.integer(), v.minValue(0))
const count = v.pipe(v.number(), v.integer(), v.minValue(0))
const id = v.pipe(v.number(), v.integer())
const date = v.pipe(v.string(), v.isoDate())

const totalsSchema = v.object({
  billed: som,
  collected: som,
  new_debt: som,
  outstanding_debt: som,
  debtors_count: count,
})

export const financeOverviewSchema = v.object({
  from: date,
  to: date,
  bucket: v.picklist(['day', 'week', 'month']),
  totals: totalsSchema,
  previous_totals: v.nullable(totalsSchema),
  series: v.array(v.object({ start: date, billed: som, collected: som })),
  doctors: v.array(v.object({ doctor_id: id, doctor: v.string(), collected: som })),
  treatment_types: v.array(
    v.object({ treatment_type_id: id, treatment_type: v.string(), billed: som }),
  ),
  top_debtors: v.array(
    v.object({
      patient_id: id,
      patient: v.string(),
      debt: som,
      last_payment_date: v.nullable(date),
      doctor: v.nullable(v.string()),
    }),
  ),
})

export type FinanceOverviewResponse = v.InferOutput<typeof financeOverviewSchema>

function toTotals(response: FinanceOverviewResponse['totals']): FinanceTotals {
  return {
    billed: response.billed,
    collected: response.collected,
    newDebt: response.new_debt,
    outstandingDebt: response.outstanding_debt,
    debtorsCount: response.debtors_count,
  }
}

export function toFinanceOverview(response: FinanceOverviewResponse): FinanceOverview {
  return {
    range: { from: response.from, to: response.to, bucket: response.bucket },
    totals: toTotals(response.totals),
    previousTotals: response.previous_totals === null ? null : toTotals(response.previous_totals),
    series: response.series,
    doctors: response.doctors.map((row) => ({
      doctorId: row.doctor_id,
      doctorName: row.doctor,
      collected: row.collected,
    })),
    treatmentTypes: response.treatment_types.map((row) => ({
      treatmentTypeId: row.treatment_type_id,
      treatmentTypeName: row.treatment_type,
      billed: row.billed,
    })),
    topDebtors: response.top_debtors.map((row) => ({
      patientId: row.patient_id,
      patientName: row.patient,
      debt: row.debt,
      lastPaymentDate: row.last_payment_date,
      doctorName: row.doctor,
    })),
  }
}
