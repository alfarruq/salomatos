import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { fetchRecipes, recipeKeys } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

describe('recipeKeys', () => {
  it('puts the clinic inside every key', () => {
    expect(recipeKeys.list(1, 101)).toEqual(['clinics', 1, 'recipes', 'list', 101])
    expect(recipeKeys.list(1, 101)).not.toEqual(recipeKeys.list(2, 101))
  })
})

describe('fetchRecipes', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reads the array the fixture has for the requested patient, with its medicines', async () => {
    const recipes = await fetchRecipes(101)

    expect(recipes).toHaveLength(1)
    expect(recipes[0]).toEqual({
      id: 1,
      doctorName: 'Sardor Usmonov',
      notes: 'Ovqatdan keyin ichish tavsiya etiladi.',
      clinicName: 'Dilnoza Rahimova',
      createdAt: '2026-08-20T09:30:00Z',
      medicines: [
        {
          id: 1,
          name: 'Amoksitsillin',
          dose: '500 mg',
          type: 'Tablet',
          frequency: 'Kuniga 2 marta',
          duration: '7 kun',
          meal: 'Ovqatdan keyin',
          minutes: 30,
        },
      ],
    })
  })

  it('sends the patient filter', async () => {
    let requested: string | undefined
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/api/v1/core/recipes/')) requested = request.url
    })

    await fetchRecipes(101)

    expect(requested).toContain('patient_id=101')
  })

  it('is empty for a patient with no prescriptions on record', async () => {
    expect(await fetchRecipes(103)).toEqual([])
  })

  it('survives a prescription with no medicines listed', async () => {
    server.use(http.get('/api/v1/core/recipes/', () => HttpResponse.json([{ id: 5, doctor: 'A' }])))

    expect((await fetchRecipes(101))[0]?.medicines).toEqual([])
  })

  it('refuses to serve prescriptions without a token', async () => {
    clearAccessToken()

    await expect(fetchRecipes(101)).rejects.toBeInstanceOf(ApiError)
  })
})
