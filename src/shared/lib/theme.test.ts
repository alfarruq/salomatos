import { afterEach, describe, expect, it } from 'vitest'
import { storage } from './storage'
import { isThemePreference, restoreTheme, useThemeStore } from './theme'

afterEach(() => {
  useThemeStore.getState().setPreference('system')
  storage.remove('theme')
})

describe('theme', () => {
  it('forces the chosen palette through data-theme', () => {
    useThemeStore.getState().setPreference('dark')

    expect(document.documentElement.dataset['theme']).toBe('dark')
    expect(useThemeStore.getState().preference).toBe('dark')
  })

  it('drops the attribute for system so the OS media query decides', () => {
    useThemeStore.getState().setPreference('light')
    useThemeStore.getState().setPreference('system')

    expect(document.documentElement.dataset['theme']).toBeUndefined()
  })

  it('accepts only known preferences', () => {
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('sepia')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
  })
  it('persists the choice and restores it on the next start', () => {
    useThemeStore.getState().setPreference('dark')
    useThemeStore.setState({ preference: 'system' })
    delete document.documentElement.dataset['theme']

    restoreTheme()

    expect(useThemeStore.getState().preference).toBe('dark')
    expect(document.documentElement.dataset['theme']).toBe('dark')
  })

  it('ignores a tampered stored value', () => {
    storage.set('theme', 'sepia')

    restoreTheme()

    expect(useThemeStore.getState().preference).toBe('system')
    expect(document.documentElement.dataset['theme']).toBeUndefined()
  })
})
