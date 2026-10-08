import { afterEach, describe, expect, it, vi } from 'vitest'
import { storage } from './storage'

afterEach(() => {
  storage.remove('locale')
  storage.remove('accessToken')
  storage.remove('refreshToken')
})

describe('storage', () => {
  it('round-trips a value under its own key', () => {
    storage.set('locale', 'ru')

    expect(storage.get('locale')).toBe('ru')
  })

  it('keeps allowlisted keys apart from each other', () => {
    storage.set('locale', 'en')
    storage.set('refreshToken', 'a-token')

    expect(storage.get('locale')).toBe('en')
    expect(storage.get('refreshToken')).toBe('a-token')
  })

  it('is null before anything was ever set', () => {
    expect(storage.get('locale')).toBeNull()
  })

  it('forgets a key on remove', () => {
    storage.set('locale', 'uz-Latn')
    storage.remove('locale')

    expect(storage.get('locale')).toBeNull()
  })

  it('falls back to null rather than throwing when storage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })

    expect(storage.get('locale')).toBeNull()

    getItem.mockRestore()
  })

  it('swallows a write failure rather than crashing the app', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded')
    })

    expect(() => storage.set('locale', 'ru')).not.toThrow()

    setItem.mockRestore()
  })
})
