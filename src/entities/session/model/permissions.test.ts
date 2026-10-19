import { describe, expect, it } from 'vitest'
import { permissionsForRole } from './permissions'

describe('permissionsForRole', () => {
  it("keeps doctors' pay to the clinic account alone", () => {
    expect(permissionsForRole('superadmin').has('payroll:manage')).toBe(true)
    expect(permissionsForRole('admin').has('payroll:manage')).toBe(false)
    expect(permissionsForRole('doctor').has('payroll:manage')).toBe(false)
  })
})
