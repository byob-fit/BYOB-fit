import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import { InProgressBar } from './InProgressBar.tsx'
import { TabBar } from './TabBar.tsx'
import { isTypingTarget } from './tabs.ts'
import { HEAL_DELAY_MS, noteTallest, readViewport, remeasure, viewportStuck, type Tallest } from './viewportHeal.ts'

/**
 * D-077 rule 2: while a text or number field has focus the keyboard is open,
 * and the tab bar and the in-progress bar step aside. The flag lives on <html>
 * so the CSS can hide both.
 */
function useKeyboardFlag() {
  useEffect(() => {
    const root = document.documentElement
    const sync = () => {
      if (isTypingTarget(document.activeElement as HTMLElement | null)) root.dataset.keyboard = 'open'
      else delete root.dataset.keyboard
    }
    // focusout fires before the next element takes focus; check once it has.
    const later = () => window.setTimeout(sync, 0)
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', later)
    return () => {
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', later)
      delete root.dataset.keyboard
    }
  }, [])
}

/**
 * D-100: once the keyboard has closed, or the app comes back to the front, a
 * window left shorter than the tallest seen is measured again, so the tab bar
 * and the docks return to the bottom of the screen.
 */
function useViewportHeal() {
  useEffect(() => {
    let tallest: Tallest | null = noteTallest(null, readViewport())
    let timer = 0
    const typing = () => isTypingTarget(document.activeElement as HTMLElement | null)
    const note = () => {
      // A height read while a field has focus may be the keyboard's; it can only raise the record.
      tallest = noteTallest(tallest, readViewport())
    }
    const check = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const root = document.getElementById('root')
        if (root && viewportStuck(tallest, readViewport(), typing())) remeasure(root)
        note()
      }, HEAL_DELAY_MS)
    }
    const shown = () => {
      if (document.visibilityState === 'visible') check()
    }
    window.addEventListener('resize', note)
    document.addEventListener('focusout', check)
    document.addEventListener('visibilitychange', shown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', note)
      document.removeEventListener('focusout', check)
      document.removeEventListener('visibilitychange', shown)
    }
  }, [])
}

/** Every screen inside the app: the tabs show throughout, the deck included (D-077, D-083 rule 6). */
export function TabbedLayout() {
  useKeyboardFlag()
  useViewportHeal()
  return (
    <div className="app app--tabbed">
      <Outlet />
      <InProgressBar />
      <TabBar />
    </div>
  )
}

/**
 * Full-screen flows with their own Back and Save, shown without the tab bar
 * (D-083 rule 6): onboarding, import and the builder.
 */
export function PlainLayout() {
  useViewportHeal()
  return (
    <div className="app">
      <Outlet />
    </div>
  )
}
