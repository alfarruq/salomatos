import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor, MOCK_USERS } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { RecipeEditor } from './RecipeEditor'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

function renderEditor() {
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <RecipeEditor
            clinicId={MOCK_USERS.clinic.id}
            onOpenChange={onOpenChange}
            open
            patientId={101}
            patientName="Dilnoza Rahimova"
          />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { onOpenChange }
}

function captureBody() {
  const captured: { body: unknown } = { body: undefined }
  server.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && request.url.includes('/api/v1/core/recipes/')) {
      captured.body = await request.clone().json()
    }
  })
  return captured
}

async function chooseDoctor() {
  await userEvent.click(await screen.findByRole('combobox', { name: 'Shifokor' }))
  await userEvent.click(await screen.findByRole('option', { name: /^Sardor Usmonov/ }))
}

/** Fills the row the editor opens with. */
async function pickMedicine(query: string, option: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Dori nomi' }))
  await userEvent.type(await screen.findByPlaceholderText('Dori nomini qidiring…'), query)
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

const SAVE = 'Retseptni saqlash'

describe('RecipeEditor', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('opens with the patient, one empty row and nothing to save', async () => {
    renderEditor()

    expect(await screen.findByDisplayValue('Dilnoza Rahimova')).toBeInTheDocument()
    expect(screen.getByText('0 ta dori')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Dori nomi' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: SAVE })).toBeDisabled()
  })

  it('opens the name picker of an added row straight away', async () => {
    renderEditor()

    await userEvent.click(await screen.findByRole('button', { name: "Dori qo'shish" }))

    expect(screen.getAllByRole('button', { name: 'Dori nomi' })).toHaveLength(2)
    expect(await screen.findByPlaceholderText('Dori nomini qidiring…')).toHaveFocus()
  })

  it('shows the hint once every row is removed', async () => {
    renderEditor()

    await userEvent.click(await screen.findByRole('button', { name: 'Dorini olib tashlash' }))

    expect(screen.getByText(/Hali dori qo'shilmagan/)).toBeInTheDocument()
  })

  it('fills the whole row from a catalog pick and saves it', async () => {
    const captured = captureBody()
    const { onOpenChange } = renderEditor()

    await chooseDoctor()
    await pickMedicine('Ketorol', 'Ketorol 10 mg')

    expect(screen.getByRole('button', { name: 'Dori nomi' })).toHaveTextContent('Ketorol 10 mg')
    expect(screen.getByRole('combobox', { name: 'Qabul' })).toHaveTextContent("Kerak bo'lganda")

    await userEvent.click(screen.getByRole('button', { name: SAVE }))

    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(captured.body).toEqual({
      patient: 101,
      doctor: 2,
      notes: '',
      medicines: [
        {
          name: 'Ketorol 10 mg',
          dose: 1,
          type: 'tablet',
          frequency: 'prn',
          duration: 3,
          meal: 'after',
          minutes: 0,
        },
      ],
    })
  })

  it('takes a name that is not in the catalog', async () => {
    const captured = captureBody()
    renderEditor()

    await chooseDoctor()
    await pickMedicine('Vitamin E', '"Vitamin E" ni qo\'shish')
    await userEvent.click(screen.getByRole('button', { name: SAVE }))

    await vi.waitFor(() =>
      expect(captured.body).toMatchObject({
        medicines: [{ name: 'Vitamin E', dose: 1, type: 'tablet', frequency: 'bid' }],
      }),
    )
  })

  it('hides minutes when the timing does not depend on food', async () => {
    renderEditor()

    expect(await screen.findByRole('textbox', { name: 'Daqiqa' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('combobox', { name: 'Ovqat' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Ovqat bilan' }))

    expect(screen.queryByRole('textbox', { name: 'Daqiqa' })).not.toBeInTheDocument()
  })

  it('keeps the dialog and the medicines when the server refuses', async () => {
    server.use(
      http.post('/api/v1/core/recipes/', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    )
    const { onOpenChange } = renderEditor()

    await chooseDoctor()
    await pickMedicine('Nimesil', 'Nimesil 100 mg')
    await userEvent.click(screen.getByRole('button', { name: SAVE }))

    await vi.waitFor(() => expect(screen.getByRole('button', { name: SAVE })).not.toBeDisabled())
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Dori nomi' })).toHaveTextContent('Nimesil 100 mg')
  })
})
