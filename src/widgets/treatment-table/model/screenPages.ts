/**
 * One screen of the treatments table is up to three server pages (30 rows):
 * the first screen opens on ten and grows by ten per "next", every later
 * screen shows all thirty at once. The URL's `page` counts screens, so a
 * shared link lands on the same thirty rows; the server still pages by ten,
 * so nothing changes on the backend.
 */
export const PAGES_PER_SCREEN = 3

/** The server pages a screen shows, given how many of them are loaded. */
export function serverPagesFor(screen: number, loaded: number): number[] {
  const first = (screen - 1) * PAGES_PER_SCREEN + 1
  return Array.from({ length: loaded }, (_, index) => first + index)
}
