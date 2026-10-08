import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIdleTimer } from './useIdleTimer'

const TIMEOUT = 12_000
const WARNING = 1_000

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function activity() {
  act(() => {
    window.dispatchEvent(new Event('keydown'))
  })
}

describe('useIdleTimer', () => {
  it('fires after the timeout', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleTimer({ onIdle, timeoutMs: TIMEOUT, warningMs: WARNING }))

    act(() => vi.advanceTimersByTime(TIMEOUT - 1))
    expect(onIdle).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(onIdle).toHaveBeenCalledOnce()
  })

  it('warns before it fires, not at the same moment', () => {
    const onIdle = vi.fn()
    const onWarning = vi.fn()
    renderHook(() => useIdleTimer({ onIdle, onWarning, timeoutMs: TIMEOUT, warningMs: WARNING }))

    act(() => vi.advanceTimersByTime(TIMEOUT - WARNING))
    expect(onWarning).toHaveBeenCalledOnce()
    expect(onIdle).not.toHaveBeenCalled()
  })

  it('starts over on activity', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleTimer({ onIdle, timeoutMs: TIMEOUT, warningMs: WARNING }))

    act(() => vi.advanceTimersByTime(TIMEOUT - 100))
    activity()
    act(() => vi.advanceTimersByTime(TIMEOUT - 100))

    // Would have fired twice over if activity did not reset it.
    expect(onIdle).not.toHaveBeenCalled()
  })

  it('reports that the user came back after a warning', () => {
    const onActive = vi.fn()
    renderHook(() =>
      useIdleTimer({ onIdle: vi.fn(), onActive, timeoutMs: TIMEOUT, warningMs: WARNING }),
    )

    act(() => vi.advanceTimersByTime(TIMEOUT - WARNING))
    activity()

    expect(onActive).toHaveBeenCalledOnce()
  })

  it('says nothing about coming back when the user never left', () => {
    const onActive = vi.fn()
    renderHook(() =>
      useIdleTimer({ onIdle: vi.fn(), onActive, timeoutMs: TIMEOUT, warningMs: WARNING }),
    )

    act(() => vi.advanceTimersByTime(1000))
    activity()

    expect(onActive).not.toHaveBeenCalled()
  })

  it('ignores a burst of mousemove rather than rescheduling on every pixel', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleTimer({ onIdle, timeoutMs: TIMEOUT, warningMs: WARNING }))

    // Two events inside the throttle window: the second must not reset anything.
    activity()
    act(() => vi.advanceTimersByTime(100))
    activity()
    act(() => vi.advanceTimersByTime(TIMEOUT - 100))

    expect(onIdle).toHaveBeenCalledOnce()
  })

  it('does nothing at all while disabled', () => {
    const onIdle = vi.fn()
    renderHook(() =>
      useIdleTimer({ onIdle, timeoutMs: TIMEOUT, warningMs: WARNING, isEnabled: false }),
    )

    act(() => vi.advanceTimersByTime(TIMEOUT * 3))

    expect(onIdle).not.toHaveBeenCalled()
  })

  it('stops when the component goes away', () => {
    const onIdle = vi.fn()
    const { unmount } = renderHook(() =>
      useIdleTimer({ onIdle, timeoutMs: TIMEOUT, warningMs: WARNING }),
    )

    unmount()
    act(() => vi.advanceTimersByTime(TIMEOUT * 2))

    expect(onIdle).not.toHaveBeenCalled()
  })
})
