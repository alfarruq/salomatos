import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
