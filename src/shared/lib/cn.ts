import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * twMerge has to be told which `text-*` names are font sizes. It knows only
 * Tailwind's own (`text-sm`, `text-lg`…), so it read ours as colours and put
 * them in one group with `text-on-accent` — and `Button`'s size (`text-body`)
 * then deleted the primary variant's white text. Mirrors the `--text-*`
 * tokens in theme.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['caption', 'callout', 'body', 'title2', 'title1', 'display'],
    },
  },
})

/**
 * Merges class names, letting a caller's utility win over the component's own.
 *
 * Plain concatenation would leave `px-4 px-2` both applied and the winner
 * decided by stylesheet order, not by intent — so a consumer could not
 * reliably override padding. twMerge resolves the conflict by keeping the last
 * one in the same utility group.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
