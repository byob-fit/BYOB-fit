// D-089 rule 1: on every screen change, close the keyboard and set the page's
// position. Going forward opens the new screen at the top; Back returns to
// where the screen was left. On iOS a field that still has focus while its
// screen is replaced can leave the page shifted by the keyboard, showing a
// blank band; releasing focus first and setting the position avoids that.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/** The longest Back waits for a screen to grow tall enough to restore into. */
export const RESTORE_WAIT_MS = 1000

export function ScrollManager() {
  const location = useLocation()
  const type = useNavigationType()
  const positions = useRef(new Map<string, number>())
  const keyRef = useRef(location.key)

  // Remember each screen's position as the user scrolls it.
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => positions.current.set(keyRef.current, window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useLayoutEffect(() => {
    keyRef.current = location.key
    const active = document.activeElement
    if (active instanceof HTMLElement && active !== document.body) active.blur()
    const target = type === 'POP' ? (positions.current.get(location.key) ?? 0) : 0
    window.scrollTo(0, target)
    if (target === 0) return
    // Back: the list may still be loading; keep trying until it is tall enough.
    const started = performance.now()
    let frame = 0
    const tryRestore = () => {
      const reachable = document.documentElement.scrollHeight - window.innerHeight >= target
      if (reachable) window.scrollTo(0, target)
      else if (performance.now() - started < RESTORE_WAIT_MS) frame = requestAnimationFrame(tryRestore)
      else window.scrollTo(0, target)
    }
    frame = requestAnimationFrame(tryRestore)
    return () => cancelAnimationFrame(frame)
  }, [location.key, type])

  return null
}
