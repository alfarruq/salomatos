import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { useUpdateDoctor } from './useUpdateDoctor'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

const INPUT = {
  fullName: 'Sardor Usmonov',
  phoneNumber: '+998901112244',
  email: '',
  doctorTypeId: '5',
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useUpdateDoctor', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('omits doctor_type when the select was never touched', async () => {
    /*
     * The list response has no doctor_type to prefill the select with, so an
     * untouched select must not be read as "clear the assignment" — sending
     * null here would silently unset a real one nobody meant to change.
     */
    let sentBody: unknown
    server.use(
      http.patch('/api/v1/clinic/doctors/:id/', async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({
          id: 2,
          full_name: 'Sardor Usmonov',
          phone_number: null,
          email: null,
        })
      }),
    )

    const { result } = renderHook(() => useUpdateDoctor(1), { wrapper })
    result.current.mutate({ doctorId: 2, input: INPUT, includeDoctorType: false })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(sentBody).not.toHaveProperty('doctor_type')
  })

  it('sends doctor_type once the select was actually changed', async () => {
    let sentBody: unknown
    server.use(
      http.patch('/api/v1/clinic/doctors/:id/', async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({
          id: 2,
          full_name: 'Sardor Usmonov',
          phone_number: null,
          email: null,
        })
      }),
    )

    const { result } = renderHook(() => useUpdateDoctor(1), { wrapper })
    result.current.mutate({ doctorId: 2, input: INPUT, includeDoctorType: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(sentBody).toMatchObject({ doctor_type: 5 })
  })
})
