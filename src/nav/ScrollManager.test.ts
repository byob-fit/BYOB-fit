// EXEC-13.2 commit C, task 4a (D-089 rule 1): a forward screen change opens
// at the top with the focused field released; Back restores the stored
// position, waiting for the screen to grow tall enough. The project has no
// DOM test environment, so React's hooks, the router and the page are stubbed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Cleanup = void | (() => void)

// A minimal hook runtime: refs persist across renders, effects run after a
// render when their dependencies change, cleaning up the previous run first.
const hooks = vi.hoisted(() => {
  const state = { slots: [] as unknown[], i: 0, pending: [] as (() => void)[] }
  const effect = (fn: () => Cleanup, deps?: unknown[]) => {
    const i = state.i++
    const prev = state.slots[i] as { deps?: unknown[]; cleanup: Cleanup } | undefined
    if (prev && deps && prev.deps && deps.every((d, k) => Object.is(d, prev.deps![k]))) return
    state.pending.push(() => {
      if (typeof prev?.cleanup === 'function') prev.cleanup()
      state.slots[i] = { deps, cleanup: fn() }
    })
  }
  const useRef = <T,>(init: T) => {
    const i = state.i++
    if (!state.slots[i]) state.slots[i] = { current: init }
    return state.slots[i] as { current: T }
  }
  return { state, effect, useRef }
})

const router = vi.hoisted(() => ({ location: { key: 'list' }, type: 'PUSH' }))

vi.mock('react', () => ({ useEffect: hooks.effect, useLayoutEffect: hooks.effect, useRef: hooks.useRef }))
vi.mock('react-router-dom', () => ({ useLocation: () => router.location, useNavigationType: () => router.type }))

const { ScrollManager, RESTORE_WAIT_MS } = await import('./ScrollManager.tsx')

// The page: scrollTo clamps to the reachable height, as a browser does.
const page = { scrollY: 0, scrollHeight: 3000, now: 0 }
const listeners = new Set<() => void>()
let frames = new Map<number, () => void>()
let nextFrame = 1

class FakeElement {
  blur = vi.fn(() => {
    fakeDocument.activeElement = fakeDocument.body
  })
}
const fakeDocument = {
  body: new FakeElement(),
  activeElement: null as FakeElement | null,
  documentElement: {
    get scrollHeight() {
      return page.scrollHeight
    },
  },
}
const fakeWindow = {
  innerHeight: 844,
  get scrollY() {
    return page.scrollY
  },
  scrollTo: (_x: number, y: number) => {
    page.scrollY = Math.max(0, Math.min(y, page.scrollHeight - 844))
    listeners.forEach((fn) => fn())
  },
  addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
  removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn),
}

/** Run the frames queued so far, after `ms` of time has passed. */
function flushFrames(ms = 16) {
  page.now += ms
  const due = frames
  frames = new Map()
  due.forEach((fn) => fn())
}

function render(key: string, type: 'PUSH' | 'POP' | 'REPLACE') {
  router.location = { key }
  router.type = type
  hooks.state.i = 0
  ScrollManager()
  const pending = hooks.state.pending
  hooks.state.pending = []
  pending.forEach((run) => run())
}

/** The user scrolls the page to `y`; the position is stored on the next frame. */
function userScroll(y: number) {
  page.scrollY = y
  listeners.forEach((fn) => fn())
  flushFrames()
}

beforeEach(() => {
  hooks.state.slots = []
  hooks.state.pending = []
  Object.assign(page, { scrollY: 0, scrollHeight: 3000, now: 0 })
  listeners.clear()
  frames = new Map()
  fakeDocument.activeElement = fakeDocument.body
  vi.stubGlobal('window', fakeWindow)
  vi.stubGlobal('document', fakeDocument)
  vi.stubGlobal('HTMLElement', FakeElement)
  vi.stubGlobal('performance', { now: () => page.now })
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
    const id = nextFrame++
    frames.set(id, fn)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ScrollManager (D-089 rule 1)', () => {
  it('a forward navigation opens at the top and releases the focused search field', () => {
    render('list', 'PUSH')
    userScroll(254)
    const search = new FakeElement()
    fakeDocument.activeElement = search

    render('exercise', 'PUSH')
    expect(search.blur).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(fakeDocument.body)
    expect(page.scrollY).toBe(0)
    // Nothing tries to move the page later, even once it is tall.
    for (let t = 0; t < 5; t++) flushFrames(100)
    expect(page.scrollY).toBe(0)
  })

  it('Back restores the position the screen was left at', () => {
    render('list', 'PUSH')
    userScroll(254)
    render('exercise', 'PUSH')
    userScroll(120)

    render('list', 'POP')
    flushFrames()
    expect(page.scrollY).toBe(254)
  })

  it('Back waits for a screen that becomes tall enough only after a delay under one second', () => {
    render('list', 'PUSH')
    userScroll(1400)
    render('exercise', 'PUSH')

    // The list is still loading: only 900 px tall, so the page can reach 56 at most.
    page.scrollHeight = 900
    render('list', 'POP')
    expect(page.scrollY).toBe(56)
    for (let t = 0; t < 600; t += 100) flushFrames(100)
    expect(page.scrollY).toBe(56)

    // At 700 ms the list has loaded; the next frame restores the stored position.
    page.scrollHeight = 3000
    flushFrames(100)
    expect(page.scrollY).toBe(1400)
    // Restored once: scrolling away afterwards is left alone.
    userScroll(300)
    for (let t = 0; t < 5; t++) flushFrames(100)
    expect(page.scrollY).toBe(300)
  })

  it('stops waiting after one second', () => {
    render('list', 'PUSH')
    userScroll(1400)
    render('exercise', 'PUSH')
    page.scrollHeight = 900
    render('list', 'POP')
    for (let t = 0; t <= RESTORE_WAIT_MS; t += 100) flushFrames(100)
    expect(page.scrollY).toBe(56)
    // A list that loads after the wait is not scrolled under the user.
    page.scrollHeight = 3000
    for (let t = 0; t < 5; t++) flushFrames(100)
    expect(page.scrollY).toBe(56)
    expect(RESTORE_WAIT_MS).toBe(1000)
  })

  it('a screen never visited opens at the top on Back', () => {
    render('list', 'PUSH')
    userScroll(500)
    render('other', 'POP')
    expect(page.scrollY).toBe(0)
  })
})
