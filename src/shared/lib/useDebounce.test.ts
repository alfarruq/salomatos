import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebounce } from './useDebounce'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebounce', () => {
  it('returns the first value immediately', () => {
    // Otherwise every screen starts with an empty search for 300ms.
    const { result } = renderHook(() => useDebounce('Ali', 300))

    expect(result.current).toBe('Ali')
  })

  it('holds the new value until the pause', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'A' },
    })

    rerender({ value: 'Aliyev' })
    expect(result.current).toBe('A')

    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('Aliyev')
  })

  it('emits once for a burst of typing, not once per keystroke', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: '' },
    })

    for (const value of ['A', 'Al', 'Ali', 'Aliy', 'Aliye', 'Aliyev']) {
      rerender({ value })
      act(() => vi.advanceTimersByTime(100))
    }

    // Still nothing: no gap was ever long enough.
    expect(result.current).toBe('')

    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('Aliyev')
  })

  it('does not emit a value that was already replaced', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'first' },
    })

    rerender({ value: 'second' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'third' })
    act(() => vi.advanceTimersByTime(300))

    // 'second' never lands: a stale search result overwriting a newer one is
    // how a receptionist ends up looking at the wrong patient.
    expect(result.current).toBe('third')
  })
})
