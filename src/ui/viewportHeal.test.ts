// D-100: when a window counts as stuck after the keyboard closes.

import { describe, expect, it } from 'vitest'

import { HEAL_TOLERANCE, noteTallest, viewportStuck, type ViewportReading } from './viewportHeal.ts'

const reading = (over: Partial<ViewportReading> = {}): ViewportReading => ({
  width: 393,
  innerHeight: 852,
  visualHeight: 852,
  offsetTop: 0,
  scale: 1,
  ...over,
})

describe('D-100 the tallest window seen', () => {
  it('starts from the first reading and only grows at the same width', () => {
    const first = noteTallest(null, reading({ innerHeight: 595 }))
    expect(first).toEqual({ width: 393, height: 595 })
    expect(noteTallest(first, reading())).toEqual({ width: 393, height: 852 })
    expect(noteTallest({ width: 393, height: 852 }, reading({ innerHeight: 595 }))).toEqual({ width: 393, height: 852 })
  })

  it('starts again at a new width, so a rotated phone is not stuck', () => {
    const rotated = reading({ width: 852, innerHeight: 393, visualHeight: 393 })
    const tallest = noteTallest({ width: 393, height: 852 }, rotated)
    expect(tallest).toEqual({ width: 852, height: 393 })
    expect(viewportStuck({ width: 393, height: 852 }, rotated, false)).toBe(false)
    expect(viewportStuck(tallest, rotated, false)).toBe(false)
  })
})

describe('D-100 a stuck window', () => {
  const tallest = { width: 393, height: 852 }

  it('is one left at the keyboard-open height with no field in focus', () => {
    expect(viewportStuck(tallest, reading({ innerHeight: 595, visualHeight: 595 }), false)).toBe(true)
  })

  it('is one whose visible part is shorter or shifted', () => {
    expect(viewportStuck(tallest, reading({ visualHeight: 828 }), false)).toBe(true)
    expect(viewportStuck(tallest, reading({ offsetTop: 24 }), false)).toBe(true)
  })

  it('is not a full window, nor one within the tolerance', () => {
    expect(viewportStuck(tallest, reading(), false)).toBe(false)
    expect(viewportStuck(tallest, reading({ innerHeight: 852 - HEAL_TOLERANCE, visualHeight: 852 - HEAL_TOLERANCE }), false)).toBe(false)
  })

  it('is never reported while a field has focus, during a zoom, or before a first reading', () => {
    const short = reading({ innerHeight: 595, visualHeight: 595 })
    expect(viewportStuck(tallest, short, true)).toBe(false)
    expect(viewportStuck(tallest, reading({ visualHeight: 426, scale: 2 }), false)).toBe(false)
    expect(viewportStuck(null, short, false)).toBe(false)
  })
})
