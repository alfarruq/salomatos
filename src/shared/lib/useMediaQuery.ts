import { useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query matches, kept in sync as the viewport changes.
 *
 * For layouts that differ in structure, not just style — a card list instead
 * of a table — where rendering both and hiding one with CSS would put every
 * row in the DOM twice.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Below Tailwind's `md`: the width at which tables give way to card lists. */
export const PHONE_QUERY = '(max-width: 767.98px)'
