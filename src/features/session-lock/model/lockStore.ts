import { create } from 'zustand'

interface LockState {
  isLocked: boolean
  /**
   * Who to ask for a password. Captured before the cache is cleared, because
   * clearing it takes the session with it.
   *
   * ⛔ Identity only — never anything about a patient. This is the one thing
   * that survives a lock, and it is on screen in a public room.
   */
  lockedEmail: string | null
  lockedName: string | null
  lock: (user: { email: string; name: string }) => void
  unlock: () => void
}

export const useLockStore = create<LockState>((set) => ({
  isLocked: false,
  lockedEmail: null,
  lockedName: null,

  lock: ({ email, name }) => set({ isLocked: true, lockedEmail: email, lockedName: name }),

  unlock: () => set({ isLocked: false, lockedEmail: null, lockedName: null }),
}))
