import { create } from 'zustand'
import { storage } from './storage'

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
}

/*
 * theme.css owns the palettes: `[data-theme]` forces one, and without the
 * attribute the `prefers-color-scheme` query follows the OS. So "system" is
 * the absence of the attribute, not a third palette.
 */
function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement
  if (preference === 'system') {
    delete root.dataset['theme']
  } else {
    root.dataset['theme'] = preference
  }
}

interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useThemeStore = create<ThemeState>()((set) => ({
  preference: 'system',
  setPreference: (preference) => {
    applyTheme(preference)
    storage.set('theme', preference)
    set({ preference })
  },
}))

/**
 * Called once on app start, before the first render, so a dark-mode user
 * never sees a light frame flash past.
 */
export function restoreTheme(): void {
  // Stored value is untrusted input: anything unknown falls back to the OS.
  const stored = storage.get('theme')
  const preference = isThemePreference(stored) ? stored : 'system'
  applyTheme(preference)
  useThemeStore.setState({ preference })
}
