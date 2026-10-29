import { describe, expect, it } from 'vitest'
import { permissionsForRole } from './permissions'

describe('permissionsForRole', () => {
  it("keeps doctors' pay to the clinic account alone", () => {
    expect(permissionsForRole('superadmin').has('payroll:manage')).toBe(true)
    expect(permissionsForRole('admin').has('payroll:manage')).toBe(false)
    expect(permissionsForRole('doctor').has('payroll:manage')).toBe(false)
  })

  it('shows clinic-wide reports to the owner only, and own reports to doctors', () => {
    expect(permissionsForRole('superadmin').has('reports:read')).toBe(true)
    expect(permissionsForRole('admin').has('reports:read')).toBe(false)
    expect(permissionsForRole('admin').has('staff:manage')).toBe(false)
    expect(permissionsForRole('doctor').has('reports:read')).toBe(false)
    expect(permissionsForRole('doctor').has('reports:own')).toBe(true)
  })
})
