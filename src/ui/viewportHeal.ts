// D-100: after the iOS keyboard closes in the installed app, the window can
// stay as short as it was with the keyboard open, which leaves the tab bar and
// the docks in the middle of the screen. These rules notice that and make the
// browser measure the window again. Pure rules first, so they can be tested.

/** A window this many px shorter than the tallest seen at this width counts as stuck. */
export const HEAL_TOLERANCE = 4

/** Wait after the keyboard flag clears, so the keyboard's own animation has ended. */
export const HEAL_DELAY_MS = 150

export interface ViewportReading {
  width: number
  innerHeight: number
  /** `visualViewport.height`, or `innerHeight` where there is no visual viewport. */
  visualHeight: number
  /** `visualViewport.offsetTop`, or 0. */
  offsetTop: number
  /** `visualViewport.scale`, or 1. A pinch zoom is not a stuck window. */
  scale: number
}

export interface Tallest {
  width: number
  height: number
}

/** The tallest window seen at the current width; a new width (rotation) starts again. */
export function noteTallest(tallest: Tallest | null, reading: ViewportReading): Tallest {
  if (!tallest || tallest.width !== reading.width) return { width: reading.width, height: reading.innerHeight }
  return reading.innerHeight > tallest.height ? { width: reading.width, height: reading.innerHeight } : tallest
}

/**
 * Stuck: with no keyboard open and no zoom, the window or its visible part is
 * shorter than the tallest seen at this width, or the visible part is shifted.
 */
export function viewportStuck(tallest: Tallest | null, reading: ViewportReading, typing: boolean): boolean {
  if (typing || !tallest || tallest.width !== reading.width) return false
  if (Math.abs(reading.scale - 1) > 0.01) return false
  const shortest = Math.min(reading.innerHeight, reading.visualHeight)
  return tallest.height - shortest > HEAL_TOLERANCE || reading.offsetTop > HEAL_TOLERANCE
}

export function readViewport(): ViewportReading {
  const visual = window.visualViewport
  return {
    width: window.innerWidth,
    innerHeight: window.innerHeight,
    visualHeight: visual?.height ?? window.innerHeight,
    offsetTop: visual?.offsetTop ?? 0,
    scale: visual?.scale ?? 1,
  }
}

/**
 * Make the browser measure the window again: take the app out of the page for
 * one synchronous layout and put it back, then restore the scroll position.
 * Nothing is unmounted, so no state is lost.
 */
export function remeasure(root: HTMLElement): void {
  const x = window.scrollX
  const y = window.scrollY
  const before = root.style.display
  root.style.display = 'none'
  void root.offsetHeight
  root.style.display = before
  window.scrollTo(x, y)
}
