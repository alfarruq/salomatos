import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useSessionStore } from '../model/store'
import type { Session } from '../model/types'
import { Can } from './Can'

function signIn(permissions: Session['permissions']) {
  useSessionStore.getState().setSession({
    userId: 'a1b2c3d4-0000-4000-8000-000000000001',
    firstName: 'Dilnoza',
    lastName: 'Rahimova',
    email: 'a@example.test',
    role: 'ClinicAdmin',
    permissions,
    clinics: [],
    activeClinicId: null,
  })
}

describe('Can', () => {
  afterEach(() => useSessionStore.getState().clear())

  it('shows a control the user is allowed to use', () => {
    signIn(new Set(['patient:archive']))

    render(
      <Can permission="patient:archive">
        <button type="button">Arxivlash</button>
      </Can>,
    )

    expect(screen.getByRole('button', { name: 'Arxivlash' })).toBeInTheDocument()
  })

  it('hides one they are not', () => {
    signIn(new Set(['patient:read']))

    render(
      <Can permission="patient:archive">
        <button type="button">Arxivlash</button>
      </Can>,
    )

    expect(screen.queryByRole('button', { name: 'Arxivlash' })).not.toBeInTheDocument()
  })

  it('hides everything when nobody is signed in', () => {
    render(
      <Can permission="patient:read">
        <button type="button">Bemorlar</button>
      </Can>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a fallback when one is given', () => {
    signIn(new Set([]))

    render(
      <Can fallback={<p>Ruxsat yo&apos;q</p>} permission="billing:read">
        <button type="button">Hisob</button>
      </Can>,
    )

    expect(screen.getByText("Ruxsat yo'q")).toBeInTheDocument()
  })
})
