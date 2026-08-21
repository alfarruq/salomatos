#!/usr/bin/env node
/**
 * Fails when a translation key exists in one locale but not the others.
 *
 * A missing key does not crash the app — i18next quietly falls back and the
 * user sees a raw key like `patients.archive`. That is exactly the kind of
 * defect that reaches production unnoticed, so it is a CI gate (§12.6).
 *
 * Locales are fixed by ADR-008.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const LOCALES_DIR = 'src/shared/i18n/locales'
const LOCALES = ['uz-Latn', 'uz-Cyrl', 'ru', 'en']

/** Flattens `{ a: { b: "x" } }` into `["a.b"]` so nesting cannot hide a gap. */
function flatten(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix]
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  )
}

async function readNamespace(locale, namespace) {
  const raw = await readFile(join(LOCALES_DIR, locale, namespace), 'utf8')
  return new Set(flatten(JSON.parse(raw)))
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

  // The union of every namespace filename across locales; a namespace present
  // in one locale and absent in another is itself a failure.
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

  for (const namespace of allNamespaces) {
    const keysByLocale = new Map()

    for (const locale of LOCALES) {
      if (!namespacesByLocale.get(locale).includes(namespace)) {
        problems.push(`${locale}/${namespace} — namespace file is missing`)
        continue
      }
      keysByLocale.set(locale, await readNamespace(locale, namespace))
    }

    const union = new Set([...keysByLocale.values()].flatMap((keys) => [...keys]))

    for (const [locale, keys] of keysByLocale) {
      const missing = [...union].filter((key) => !keys.has(key)).sort()
      for (const key of missing) {
        problems.push(`${locale}/${namespace} — missing key: ${key}`)
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

  const keyCount = allNamespaces.length
  console.log(`i18n:check OK — ${LOCALES.length} locales, ${keyCount} namespace(s) in sync.`)
  return 0
}

process.exitCode = await main()
