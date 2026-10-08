import i18next, { type i18n as I18n } from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { initReactI18next } from 'react-i18next'
import { storage } from '@/shared/lib/storage'
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALES,
  type Locale,
  type Namespace,
  resolveLocale,
} from './locales'

/**
 * i18next setup.
 *
 * ⚠️ **No ICU plugin, deliberately** — a documented departure from §12.2.
 *
 * The requirement §12.2 is protecting is correct Russian plurals: three forms
 * for 1 / 2–4 / 5–20, where a naive `n > 1` is wrong. i18next's own plural
 * handling is built on `Intl.PluralRules`, which gets Russian right including
 * the cases people forget — 21 is `one`, 22 is `few`, 101 is `one`. It is
 * covered by a test.
 *
 * The plugin route costs `intl-messageformat`, 113 KB unpacked, against a
 * remaining bundle budget of roughly 20 KB (§14.1). Paying that for behaviour
 * the platform already provides is not a trade worth making. Reverting is a
 * config change plus a JSON syntax change, not a rewrite.
 *
 * The `i18next-browser-languagedetector` plugin is still not used — it also
 * sniffs `<html lang>`, cookies and query strings, more surface than this app
 * needs for one job. That job — remembering the choice across a reload — is
 * done through `shared/lib/storage`'s `locale` key instead (§3's allowlist),
 * validated on the way back in rather than trusted: a corrupted or foreign
 * value falls back to the browser's own preference, same as before this
 * existed.
 */

/**
 * Each (locale, namespace) pair becomes its own chunk, so the four locales do
 * not all ship to everyone.
 */
const backend = resourcesToBackend(
  (language: string, namespace: string) =>
    import(`./locales/${language}/${namespace}.json`) as Promise<{ default: unknown }>,
)

export function createI18n(initialLocale?: Locale): I18n {
  const stored = storage.get('locale')
  const locale =
    initialLocale ??
    (stored !== null && isLocale(stored) ? stored : null) ??
    resolveLocale(typeof navigator === 'undefined' ? [] : [...navigator.languages])

  const instance = i18next.createInstance()

  // Every future change — from the switcher or anywhere else — persists the
  // same way, so this is the only place that needs to know storage exists.
  instance.on('languageChanged', (next) => {
    if (isLocale(next)) storage.set('locale', next)
    if (typeof document !== 'undefined') document.documentElement.lang = next
  })

  void instance
    .use(backend)
    .use(initReactI18next)
    .init({
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: [...LOCALES],
      // Uzbek Latin and Cyrillic must not fall back to each other: they are
      // different locales, and a half-transliterated screen reads as a bug.
      nonExplicitSupportedLngs: false,
      ns: 'common',
      defaultNS: 'common',
      interpolation: {
        // React escapes for us; doing it twice mangles apostrophes, and Uzbek
        // is full of them.
        escapeValue: false,
      },
      react: {
        useSuspense: true,
      },
      // A missing key should be visible in development and never crash a
      // clinic in production; `i18n:check` is what actually keeps them in sync.
      returnEmptyString: false,
    })

  return instance
}

export type { Locale, Namespace }
