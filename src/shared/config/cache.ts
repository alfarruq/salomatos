/**
 * Cache policy by kind of data (§6.3).
 *
 * One staleTime for everything is the most common mistake: if today's schedule
 * is stale, two patients get booked into the same slot; if the service list is
 * refetched every 30 seconds, a thousand clinics send Django 2000 pointless
 * requests a minute.
 */
export const cachePolicy = {
  /** Barely changes: services, tooth chart, roles, reference data. */
  static: {
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  },

  /** Middling: patients, staff, prices. */
  standard: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },

  /**
   * Moves constantly: today's schedule, queue state, free slots.
   *
   * ADR-009 starts with polling instead of Channels, so this is where the
   * polling lives — and only here. Applying it more widely is what turns
   * "a poll" into a load problem across a thousand clinics.
   */
  live: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  },

  /**
   * Money. Always refetched, but kept briefly so going back to a page does not
   * blank the figures while the request is in flight.
   *
   * Referenced by §10 of CLAUDE.md but absent from §6.3 of ARCHITECTURE.md —
   * added here to close that gap. Optimistic updates are forbidden on anything
   * using this policy (§6.5).
   */
  financial: {
    staleTime: 0,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: true,
  },

  /** Never cached: one-time tokens, payment confirmation state. */
  never: {
    staleTime: 0,
    gcTime: 0,
  },
} as const

export type CachePolicyName = keyof typeof cachePolicy
