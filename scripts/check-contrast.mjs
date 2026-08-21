#!/usr/bin/env node
/**
 * WCAG contrast gate for the design tokens (§11.7).
 *
 * Colour contrast is the one accessibility rule that cannot be judged by eye —
 * a palette can look calm and still be unreadable for a receptionist on a
 * glossy screen under clinic lighting. So it is measured, in CI, from the same
 * file the UI actually uses.
 *
 * Opaque tokens only. Alpha borders composite against whatever sits behind
 * them and are reviewed by hand.
 */
import { readFile } from 'node:fs/promises'

const THEME = 'src/app/styles/theme.css'

const AA_TEXT = 4.5
const AA_UI = 3.0

/**
 * Text pairs: token → the surfaces it may legally sit on.
 *
 * `text-tertiary` deliberately omits `sunken`. Tertiary text on an input
 * background cannot reach AA without collapsing the three-level hierarchy
 * §11.1 asks for, so the rule is that it is never used there — placeholders
 * use text-secondary. Encoded here rather than left to reviewers' memory.
 */
const TEXT_PAIRS = [
  ['text', ['canvas', 'surface', 'elevated', 'sunken']],
  ['text-secondary', ['canvas', 'surface', 'elevated', 'sunken']],
  ['text-tertiary', ['canvas', 'surface', 'elevated']],
  ['accent-text', ['canvas', 'surface', 'elevated', 'sunken', 'accent-soft']],
  ['success', ['canvas', 'surface']],
  ['warning', ['canvas', 'surface']],
  ['danger', ['canvas', 'surface']],
  ['on-accent', ['accent', 'accent-hover']],
  ['on-danger', ['danger-fill', 'danger-hover']],
]

/**
 * Non-text UI that still has to be distinguishable from its background:
 * 3:1 is enough. This is the accent used as a fill, border or icon.
 */
const UI_PAIRS = [['accent', ['canvas', 'surface', 'elevated']]]

function parseHex(hex) {
  const value = hex.trim().replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ]
}

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]) {
  const channel = (value) => {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(foreground, background) {
  const a = luminance(parseHex(foreground))
  const b = luminance(parseHex(background))
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

/**
 * Reads `--color-*` declarations from one CSS block. Later declarations win,
 * which mirrors how the cascade resolves them in the browser.
 */
function readTokens(block) {
  const tokens = new Map()
  for (const match of block.matchAll(/--color-([a-z-]+):\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim())
  }
  return tokens
}

function extractBlock(css, startPattern) {
  const start = css.indexOf(startPattern)
  if (start === -1) {
    throw new Error(`Could not find "${startPattern}" in ${THEME}`)
  }
  let depth = 0
  let index = css.indexOf('{', start)
  const from = index
  do {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') depth -= 1
    index += 1
  } while (depth > 0 && index < css.length)
  return css.slice(from, index)
}

function check(themeName, tokens) {
  const failures = []
  const rows = []

  const run = (pairs, threshold, kind) => {
    for (const [foreground, backgrounds] of pairs) {
      for (const background of backgrounds) {
        const fg = tokens.get(foreground)
        const bg = tokens.get(background)
        // Alpha tokens (oklch with a slash) are out of scope for this gate.
        if (!fg?.startsWith('#') || !bg?.startsWith('#')) continue

        const ratio = contrast(fg, bg)
        const ok = ratio >= threshold
        rows.push(
          `  ${ok ? 'ok  ' : 'FAIL'} ${ratio.toFixed(2)}:1  ${foreground} on ${background} (${kind}, needs ${threshold})`,
        )
        if (!ok) {
          failures.push(
            `${themeName}: ${foreground} on ${background} is ${ratio.toFixed(2)}:1, needs ${threshold}:1`,
          )
        }
      }
    }
  }

  run(TEXT_PAIRS, AA_TEXT, 'text')
  run(UI_PAIRS, AA_UI, 'ui')

  console.log(`\n${themeName}:`)
  for (const row of rows) console.log(row)

  return failures
}

const css = await readFile(THEME, 'utf8')

const light = readTokens(extractBlock(css, '@theme'))
const dark = readTokens(extractBlock(css, ':root[data-theme="dark"]'))

const failures = [...check('light', light), ...check('dark', dark)]

if (failures.length > 0) {
  console.error(`\ncheck:contrast FAILED — ${failures.length} pair(s) below WCAG AA:\n`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exitCode = 1
} else {
  console.log('\ncheck:contrast OK — every opaque token pair meets WCAG AA.')
}
