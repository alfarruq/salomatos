import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePatientSearch } from './usePatientSearch'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('usePatientSearch', () => {
  it('shows every keystroke but queries only after a pause', () => {
    const { result } = renderHook(() => usePatientSearch())

    act(() => result.current.setTerm('Aliyev'))

    // The input must stay responsive...
    expect(result.current.term).toBe('Aliyev')
    // ...while the request waits.
    expect(result.current.debouncedTerm).toBe('')

    act(() => vi.advanceTimersByTime(300))
    expect(result.current.debouncedTerm).toBe('Aliyev')
  })

  it('clears both halves', () => {
    const { result } = renderHook(() => usePatientSearch())

    act(() => result.current.setTerm('Aliyev'))
    act(() => vi.advanceTimersByTime(300))
    act(() => result.current.clear())
    act(() => vi.advanceTimersByTime(300))

    expect(result.current.term).toBe('')
    expect(result.current.debouncedTerm).toBe('')
  })

  it('never touches the URL', () => {
    /*
     * 🔴 §3, stated as a test because it is the rule most easily lost in a
     * later refactor: a patient's name in the address bar reaches the access
     * log, the Referer header, the browser's history and anyone looking at the
     * screen. This hook holds it in memory and nowhere else.
     */
    const before = window.location.href
    const { result } = renderHook(() => usePatientSearch())

    act(() => result.current.setTerm('Aliyev'))
    act(() => vi.advanceTimersByTime(300))

    expect(window.location.href).toBe(before)
    expect(window.location.search).not.toContain('Aliyev')
  })
})
