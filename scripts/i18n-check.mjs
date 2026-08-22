#!/usr/bin/env node
/**
 * Fails when a translation key exists in one locale but not the others.
 *
 * A missing key does not crash the app — i18next quietly falls back and the
 * user sees a raw key like `patients.archive`. That is exactly the kind of
 * defect that reaches production unnoticed, so it is a CI gate (§12.6).
 *
 * Plural keys are checked differently, and that difference is the point of
 * §12.2: Russian needs three forms for 1 / 2–4 / 5–20, Uzbek and English need
 * two. Demanding the same suffixes everywhere would be wrong in both
 * directions — so each locale is required to carry exactly the categories
 * `Intl.PluralRules` says its language has. A Russian file missing `_few` is
 * the real risk here, and this is what catches it.
 *
 * Locales are fixed by ADR-008.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const LOCALES_DIR = 'src/shared/i18n/locales'
const LOCALES = ['uz-Latn', 'uz-Cyrl', 'ru', 'en']

const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])

/** Flattens `{ a: { b: "x" } }` into `["a.b"]` so nesting cannot hide a gap. */
function flatten(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix]
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  )
}

/** `patientCount_few` → `{ base: 'patientCount', category: 'few' }`. */
function splitPlural(key) {
  const index = key.lastIndexOf('_')
  if (index === -1) return { base: key, category: null }

  const category = key.slice(index + 1)
  return PLURAL_CATEGORIES.has(category)
    ? { base: key.slice(0, index), category }
    : { base: key, category: null }
}

async function readNamespace(locale, namespace) {
  const raw = await readFile(join(LOCALES_DIR, locale, namespace), 'utf8')
  return flatten(JSON.parse(raw))
}

async function main() {
  let localeDirs
  try {
    localeDirs = await readdir(LOCALES_DIR)
  } catch {
    console.warn(`i18n:check — ${LOCALES_DIR} does not exist yet (phase 5). Nothing to verify.`)
    return 0
  }

  const missingLocales = LOCALES.filter((locale) => !localeDirs.includes(locale))
  if (missingLocales.length === LOCALES.length) {
    console.warn('i18n:check — no locales present yet (phase 5). Nothing to verify.')
    return 0
  }
  if (missingLocales.length > 0) {
    console.error(`i18n:check — missing locale directories: ${missingLocales.join(', ')}`)
    return 1
  }

  const namespacesByLocale = new Map()
  for (const locale of LOCALES) {
    const files = await readdir(join(LOCALES_DIR, locale))
    namespacesByLocale.set(
      locale,
      files.filter((file) => file.endsWith('.json')),
    )
  }
  const allNamespaces = [...new Set([...namespacesByLocale.values()].flat())].sort()

  const problems = []
  let plainKeys = 0
  let pluralKeys = 0

  for (const namespace of allNamespaces) {
    /** locale → { plain: Set<string>, plural: Map<base, Set<category>> } */
    const byLocale = new Map()

    for (const locale of LOCALES) {
      if (!namespacesByLocale.get(locale).includes(namespace)) {
        problems.push(`${locale}/${namespace} — namespace file is missing`)
        continue
      }

      const plain = new Set()
      const plural = new Map()

      for (const key of await readNamespace(locale, namespace)) {
        const { base, category } = splitPlural(key)
        if (category === null) {
          plain.add(base)
          continue
        }
        if (!plural.has(base)) plural.set(base, new Set())
        plural.get(base).add(category)
      }

      byLocale.set(locale, { plain, plural })
    }

    const allPlain = new Set([...byLocale.values()].flatMap((entry) => [...entry.plain]))
    const allPluralBases = new Set(
      [...byLocale.values()].flatMap((entry) => [...entry.plural.keys()]),
    )
    plainKeys += allPlain.size
    pluralKeys += allPluralBases.size

    for (const [locale, entry] of byLocale) {
      for (const key of [...allPlain].sort()) {
        if (!entry.plain.has(key)) {
          problems.push(`${locale}/${namespace} — missing key: ${key}`)
        }
      }

      // Exactly the categories this language actually has: no more, no fewer.
      const required = new Set(new Intl.PluralRules(locale).resolvedOptions().pluralCategories)

      for (const base of [...allPluralBases].sort()) {
        const present = entry.plural.get(base) ?? new Set()

        for (const category of [...required].sort()) {
          if (!present.has(category)) {
            problems.push(`${locale}/${namespace} — missing plural form: ${base}_${category}`)
          }
        }
        for (const category of [...present].sort()) {
          if (!required.has(category)) {
            problems.push(
              `${locale}/${namespace} — ${base}_${category} is not a plural form ${locale} uses`,
            )
          }
        }
      }
    }
  }

  if (problems.length > 0) {
    console.error(`i18n:check FAILED — ${problems.length} problem(s):\n`)
    for (const problem of problems) {
      console.error(`  ${problem}`)
    }
    return 1
  }

  console.log(
    `i18n:check OK — ${LOCALES.length} locales · ${allNamespaces.length} namespace(s) · ` +
      `${plainKeys} keys · ${pluralKeys} plural key(s) with per-language forms.`,
  )
  return 0
}

process.exitCode = await main()
