// D-092 rule 5: when focusing a set box, the deck scrolls once, and only when needed.

/** True unless the row is fully visible below the header and its centre is above the midline (frame 4.09). */
export function needsCentring(rect: { top: number; bottom: number }, viewTop: number, viewHeight: number, headerBottom: number): boolean {
  const upper = Math.max(viewTop, headerBottom) + 8
  const midline = viewTop + viewHeight / 2
  return !(rect.top >= upper && (rect.top + rect.bottom) / 2 <= midline)
}
