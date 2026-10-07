import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor, MOCK_USERS } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { PrescriptionCards } from './PrescriptionCards'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

function renderCards(patientId = 101) {
  const handlers = { onCreate: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onPrint: vi.fn() }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <PrescriptionCards clinicId={MOCK_USERS.clinic.id} patientId={patientId} {...handlers} />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return handlers
}

describe('PrescriptionCards', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('lists the newest prescription first, dated dd.MM.yyyy', async () => {
    renderCards()

    const newer = await screen.findByText('02.09.2026')
    const older = screen.getByText('20.08.2026')
    // DOCUMENT_POSITION_FOLLOWING: the older card comes after the newer one.
    expect(newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows each medicine as a chip with its dosage, and the count', async () => {
    renderCards()

    expect(await screen.findByText('Amoksiklav 625 mg · 1 tabletka')).toBeInTheDocument()
    expect(screen.getByText('Xolisal gel · 1 marta surtish')).toBeInTheDocument()
    expect(screen.getByText('2 ta dori')).toBeInTheDocument()
  })

  it("keeps an older row's own wording instead of dropping it", async () => {
    renderCards()

    expect(await screen.findByText('Amoksitsillin · 1 Tabletka')).toBeInTheDocument()
  })

  it('shows the note when there is one, and nothing when it is empty', async () => {
    renderCards()

    expect(await screen.findByText("Issiq ovqat iste'mol qilmang.")).toBeInTheDocument()
  })

  it('hands the right prescription to each action', async () => {
    const { onEdit, onDelete, onPrint } = renderCards()

    const card = (await screen.findByText('02.09.2026')).closest('div.flex.flex-col') as HTMLElement
    await userEvent.click(within(card).getByRole('button', { name: 'Tahrirlash' }))
    await userEvent.click(within(card).getByRole('button', { name: "O'chirish" }))
    await userEvent.click(within(card).getByRole('button', { name: 'Chop etish' }))

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    expect(onPrint).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('invites a first prescription when there are none', async () => {
    const { onCreate } = renderCards(103)

    expect(
      await screen.findByRole('heading', { name: "Hozircha retsept yo'q" }),
    ).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Retsept yozish' })
    await userEvent.click(buttons[buttons.length - 1] as HTMLElement)

    expect(onCreate).toHaveBeenCalledTimes(1)
  })
})
