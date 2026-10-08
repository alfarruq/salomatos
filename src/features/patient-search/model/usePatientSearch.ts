import { useState } from 'react'
import { useDebounce } from '@/shared/lib/useDebounce'

/** Long enough to swallow a burst of typing, short enough not to feel laggy. */
const SEARCH_DEBOUNCE_MS = 300

export interface PatientSearch {
  /** What is in the input, updated on every keystroke. */
  term: string
  setTerm: (term: string) => void
  /** What the query should use. Trails `term` by the debounce. */
  debouncedTerm: string
  clear: () => void
}

/**
 * 🔴 Search state, held in `useState` and **never written to the URL**.
 *
 * §3 is unambiguous about why. A patient's name in a query string reaches the
 * server's access log, the `Referer` header of every subsequent request, the
 * browser's own history, and whatever is on screen when a receptionist shares
 * it. `?q=Aliyev+Vali` is a PHI disclosure; `?patient=101` is not.
 *
 * This is the one filter that stays out of the URL. Date, status, page and sort
 * belong in it — a colleague being able to send a link to a filtered list is
 * the difference between a tool and a toy — and the widget puts them there.
 *
 * ⚠️ The term still reaches the server as `?search=`, because that is the only
 * form `PatientFilter` accepts. Debouncing reduces it to one log line per
 * search rather than one per letter, but the log itself has to be configured
 * not to record query strings before this ships.
 */
export function usePatientSearch(): PatientSearch {
  const [term, setTerm] = useState('')
  const debouncedTerm = useDebounce(term, SEARCH_DEBOUNCE_MS)

  return {
    term,
    setTerm,
    debouncedTerm,
    clear: () => setTerm(''),
  }
}
