import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import { createI18n } from '@/shared/i18n'
import type { PatientStatus, PatientTreatment } from '../model/types'
import { ToothChart } from './ToothChart'

function renderChart(treatments: readonly PatientTreatment[], status: PatientStatus | null) {
  return render(
    <I18nextProvider i18n={createI18n('uz-Latn')}>
      <Suspense fallback={null}>
        <ToothChart status={status} treatments={treatments} />
      </Suspense>
    </I18nextProvider>,
  )
}

/** The visible label text, not the `<rect><title>` tooltip — both can hold the same digits. */
function labelsOf(container: HTMLElement): string[] {
  return [...container.querySelectorAll('svg > g > text')].map((node) => node.textContent)
}

/**
 * `<title>` nested inside a shape like `<rect>` (rather than directly inside
 * `<svg>`) is a real, screen-reader-honoured accessible name, but it is not
 * what `@testing-library`'s `getByTitle` looks for — that query only matches
 * `svg > title`. A plain DOM query is the honest way to assert on it here.
 */
function toothTitlesOf(container: HTMLElement): string[] {
  return [...container.querySelectorAll('rect > title')].map((node) => node.textContent)
}

describe('ToothChart', () => {
  it('renders all 32 FDI tooth numbers exactly once', async () => {
    const { container } = renderChart([], null)

    await screen.findByRole('img', { name: 'Tish xaritasi' })
    const labels = labelsOf(container)
    expect(labels).toHaveLength(32)
    for (const tooth of [11, 18, 21, 28, 31, 38, 41, 48]) {
      expect(labels).toContain(String(tooth))
    }
  })

  it('names the treatment on the tooth it belongs to, in its accessible title', async () => {
    const { container } = renderChart(
      [{ id: 7, name: 'Implantatsiya', toothNumber: 36 }],
      'in_progress',
    )

    await screen.findByRole('img', { name: 'Tish xaritasi' })
    expect(toothTitlesOf(container)).toContain('36 — Implantatsiya')
  })

  it('shows both legend states regardless of which one is in use', async () => {
    renderChart([{ id: 7, name: 'Implantatsiya', toothNumber: 36 }], 'completed')

    expect(await screen.findByText('Yakunlangan')).toBeInTheDocument()
    expect(screen.getByText('Davolanmoqda')).toBeInTheDocument()
  })

  it('ignores a treatment with no tooth number rather than crashing', async () => {
    const { container } = renderChart(
      [{ id: 9, name: 'Konsultatsiya', toothNumber: null }],
      'in_progress',
    )

    await screen.findByRole('img', { name: 'Tish xaritasi' })
    expect(labelsOf(container)).toHaveLength(32)
    expect(toothTitlesOf(container).some((title) => title?.includes('Konsultatsiya'))).toBe(false)
  })
})
