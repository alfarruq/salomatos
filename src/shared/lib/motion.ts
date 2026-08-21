import type { Transition } from 'motion/react'
import { useReducedMotion } from 'motion/react'

/**
 * The motion vocabulary from §11.5. Components pick a preset; they do not
 * invent durations.
 *
 * Motion here exists to cover latency, not to draw attention — in a clinic
 * panel used all day, extra movement is a source of fatigue.
 */

/** Physical movement: switches, sheets, drag. Never a duration. */
export const springs = {
  /** Small controls — switch knob, checkbox tick. §11.5 verbatim. */
  control: { type: 'spring', stiffness: 400, damping: 32, mass: 0.8 },
  /** Large surfaces — sheets, drawers. Softer so it does not feel snappy. */
  surface: { type: 'spring', stiffness: 260, damping: 30, mass: 1 },
} as const satisfies Record<string, Transition>

/** Apple's signature curve, as a motion-friendly tuple. */
export const easeOutApple = [0.32, 0.72, 0, 1] as const

/** Non-physical changes: colour, opacity, simple reveals. */
export const durations = {
  /** Colour and opacity (§11.5). */
  fast: 0.15,
  /** Modal open: 0.96 → 1 scale with opacity. */
  modal: 0.22,
} as const

/** List reveal. §11.5 caps this — more than 0.02s reads as sluggish. */
export const LIST_STAGGER = 0.02

/** Applied when the user asked the OS for less motion: state changes, no travel. */
const INSTANT: Transition = { duration: 0 }

/**
 * Returns the transition to use, collapsing it to an instant change when the
 * user prefers reduced motion.
 *
 * The global CSS rule in theme.css already neutralises CSS transitions, but
 * JS-driven springs are outside its reach — every animated component has to
 * ask (§11.5).
 */
export function useTransition(preset: Transition): Transition {
  const shouldReduceMotion = useReducedMotion()
  return shouldReduceMotion ? INSTANT : preset
}

/**
 * True when motion should be suppressed. Use it when the decision is not just
 * a transition — for example skipping an entrance animation entirely.
 */
export function useMotionDisabled(): boolean {
  return useReducedMotion() ?? false
}
