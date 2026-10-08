import { afterEach, describe, expect, it } from 'vitest'
import { storage } from '@/shared/lib/storage'
import { createI18n } from './config'
import { DEFAULT_LOCALE, isLocale, LOCALES, resolveLocale } from './locales'

/**
 * Waits for init *and* for the namespaces to arrive.
 *
 * `loadNamespaces` alone resolves too early against an instance that is still
 * initialising, and `t()` then answers from the fallback locale — which reads
 * as "the translation is wrong" rather than "the test asked too soon".
 *
 * The app does not need this: react-i18next suspends until the namespace is
 * there, which is what the Suspense boundary in AppProviders is for.
 */
async function ready(locale: Parameters<typeof createI18n>[0]) {
  const instance = createI18n(locale)

  if (!instance.isInitialized) {
    await new Promise((resolve) => {
      instance.on('initialized', () => resolve(undefined))
    })
  }
  await instance.loadNamespaces(['common', 'auth', 'validation'])

  return instance
}

describe('Russian plurals', () => {
  /**
   * §12.2's actual requirement: three forms for 1 / 2–4 / 5–20, where a naive
   * `n > 1` is wrong. The ICU plugin was skipped in favour of i18next's own
   * `Intl.PluralRules` handling, so this is the test that keeps that honest.
   */
  it('picks the right form across the awkward numbers', async () => {
    const i18n = await ready('ru')
    const count = (n: number) => i18n.t('patientCount', { count: n })

    expect(count(1)).toBe('1 пациент')
    expect(count(2)).toBe('2 пациента')
    expect(count(4)).toBe('4 пациента')
    expect(count(5)).toBe('5 пациентов')
    expect(count(11)).toBe('11 пациентов')

    // The ones people get wrong: 21 is singular again, 22 is few, 25 is many.
    expect(count(21)).toBe('21 пациент')
    expect(count(22)).toBe('22 пациента')
    expect(count(25)).toBe('25 пациентов')
    expect(count(101)).toBe('101 пациент')
  })

  it('uses two forms where the language has two', async () => {
    const i18n = await ready('en')

    expect(i18n.t('patientCount', { count: 1 })).toBe('1 patient')
    expect(i18n.t('patientCount', { count: 5 })).toBe('5 patients')
  })
})

describe('locale resolution', () => {
  it('keeps the two Uzbek scripts apart', () => {
    expect(resolveLocale(['uz-Cyrl'])).toBe('uz-Cyrl')
    expect(resolveLocale(['uz-Latn'])).toBe('uz-Latn')
  })

  it('reads bare `uz` as Latin, the script in official use', () => {
    expect(resolveLocale(['uz'])).toBe('uz-Latn')
    expect(resolveLocale(['uz-UZ'])).toBe('uz-Latn')
  })

  it('matches on language when the region is unfamiliar', () => {
    expect(resolveLocale(['ru-KZ'])).toBe('ru')
    expect(resolveLocale(['en-AU'])).toBe('en')
  })

  it('takes the first language it recognises', () => {
    expect(resolveLocale(['de', 'fr', 'ru'])).toBe('ru')
  })

  it('falls back rather than failing', () => {
    expect(resolveLocale(['de'])).toBe(DEFAULT_LOCALE)
    expect(resolveLocale([])).toBe(DEFAULT_LOCALE)
  })

  it('recognises exactly the four locales from ADR-008', () => {
    expect(LOCALES).toEqual(['uz-Latn', 'uz-Cyrl', 'ru', 'en'])
    expect(isLocale('kaa')).toBe(false)
  })
})

describe('locale persistence (§3 allowlist)', () => {
  afterEach(() => storage.remove('locale'))

  it('starts from the stored locale rather than the browser default', async () => {
    storage.set('locale', 'ru')

    const i18n = createI18n()
    if (!i18n.isInitialized) {
      await new Promise((resolve) => i18n.on('initialized', () => resolve(undefined)))
    }

    expect(i18n.language).toBe('ru')
  })

  it('ignores a corrupted stored value rather than crashing', async () => {
    storage.set('locale', 'not-a-real-locale')

    const i18n = createI18n()
    if (!i18n.isInitialized) {
      await new Promise((resolve) => i18n.on('initialized', () => resolve(undefined)))
    }

    // Falls through to the browser-language resolver, same as an empty store —
    // never the raw, unvalidated value that was sitting in storage.
    expect(LOCALES).toContain(i18n.language)
    expect(i18n.language).not.toBe('not-a-real-locale')
  })

  it('persists a change made after startup', async () => {
    const i18n = await ready('uz-Latn')

    await i18n.changeLanguage('en')

    expect(storage.get('locale')).toBe('en')
  })
})

describe('translation loading', () => {
  it('resolves keys in each locale', async () => {
    for (const locale of LOCALES) {
      const i18n = await ready(locale)
      const submit = i18n.t('auth:login.submit')

      // Never a raw key on screen.
      expect(submit).not.toContain('login.submit')
      expect(submit.length).toBeGreaterThan(0)
    }
  })

  it('does not fall back between the Uzbek scripts', async () => {
    const cyrillic = await ready('uz-Cyrl')

    // A half-transliterated screen reads as a bug (§12.5).
    expect(cyrillic.t('auth:login.password')).toBe('Парол')
  })

  it('interpolates without double-escaping apostrophes', async () => {
    const i18n = await ready('uz-Latn')

    // React escapes already; Uzbek is full of apostrophes.
    expect(i18n.t('auth:lock.subtitle', { name: "Vali O'ktamov" })).toContain("O'ktamov")
  })
})
