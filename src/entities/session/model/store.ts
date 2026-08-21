import { create } from 'zustand'
import type { Permission, Session } from './types'

/**
 * The session, in memory and nowhere else.
 *
 * ⛔ No `persist` middleware. §13.2 and ADR-007: the reception desk computer is
 * shared, and anything written to localStorage survives logout for the next
 * member of staff — or for a browser extension — to read. Losing the session on
 * refresh is the intended trade: `/api/me/` restores it from the cookie.
 */
interface SessionState {
  session: Session | null
  setSession: (session: Session | null) => void
  /** Which clinic's data the app is currently scoped to. */
  activeClinicId: string | null
  setActiveClinicId: (clinicId: string | null) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  activeClinicId: null,

  setSession: (session) =>
    set({
      session,
      activeClinicId: session?.activeClinicId ?? null,
    }),

  setActiveClinicId: (activeClinicId) => set({ activeClinicId }),

  clear: () => set({ session: null, activeClinicId: null }),
}))

/**
 * Frontend permission check — for hiding controls the user cannot use, nothing
 * more. §9.1: the real authorisation is Django's, and every queryset there is
 * filtered by clinic. A check here is bypassed in DevTools in five seconds.
 */
export function useCan(permission: Permission): boolean {
  return useSessionStore((state) => state.session?.permissions.has(permission) ?? false)
}

/** Reads the clinic id outside React — for the HTTP client's tenant header. */
export function getActiveClinicId(): string | null {
  return useSessionStore.getState().activeClinicId
}
