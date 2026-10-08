import { useEffect, useState } from 'react'

/**
 * Follows a value, but only after it has stopped changing.
 *
 * Written for patient search, where it does two jobs at once. The obvious one
 * is load: a receptionist typing "Aliyev" would otherwise send six requests to
 * a server that has no index on `full_name`.
 *
 * The other is why the search box does not live in the URL at all (§3). Every
 * keystroke that reaches the server arrives as `?search=Ali`, `?search=Aliy`,
 * `?search=Aliye` in the access log. Debouncing does not make that acceptable —
 * nginx still must not log query strings — but it does mean one entry per
 * search instead of one per letter.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    // Every change restarts the clock, so only a pause emits.
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
