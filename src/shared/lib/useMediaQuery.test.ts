import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery'

function mockMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  const original = window.matchMedia
  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  })) as unknown as typeof window.matchMedia
  return {
    set(next: boolean) {
      matches = next
      for (const listener of listeners) listener()
    },
    restore() {
      window.matchMedia = original
    },
  }
}

let media: ReturnType<typeof mockMatchMedia> | null = null

afterEach(() => {
  media?.restore()
  media = null
})

describe('useMediaQuery', () => {
  it('reports the current match', () => {
    media = mockMatchMedia(true)

    const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'))

    expect(result.current).toBe(true)
  })

  it('follows the viewport when it changes', () => {
    media = mockMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'))

    act(() => media?.set(true))

    expect(result.current).toBe(true)
  })
})
