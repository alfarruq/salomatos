import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import { createI18n } from '@/shared/i18n'
import type { PatientStatus } from '../model/types'
import { PatientStatusBadge } from './PatientStatusBadge'

/**
 * Pinned to the product default rather than the browser's: jsdom reports
 * en-US, so these assertions would quietly start checking English and stop
 * saying anything about what staff actually see.
 *
 * Suspense because namespaces load on demand (§12.1) — the first render of a
 * screen using `patients` suspends while its chunk arrives.
 */
function renderBadge(status: PatientStatus | null) {
  render(
    <I18nextProvider i18n={createI18n('uz-Latn')}>
      <Suspense fallback={null}>
        <PatientStatusBadge status={status} />
      </Suspense>
    </I18nextProvider>,
  )
}

describe('PatientStatusBadge', () => {
  it('names an in-progress treatment in the active language', async () => {
    renderBadge('in_progress')

    expect(await screen.findByText('Davolanmoqda')).toBeInTheDocument()
  })

  it('names a finished one', async () => {
    renderBadge('completed')

    expect(await screen.findByText('Yakunlangan')).toBeInTheDocument()
  })

  it('says so when there is no treatment rather than rendering an empty badge', async () => {
    // `get_status` returns null for a patient with nothing on record, which is
    // most newly registered patients.
    renderBadge(null)

    expect(await screen.findByText("Davolanish yo'q")).toBeInTheDocument()
  })
})
