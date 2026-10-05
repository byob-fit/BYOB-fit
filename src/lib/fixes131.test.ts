/// <reference types="node" />
// EXEC-13.1 commit C (D-088): Add exercise on the tile, the cardio minutes
// box, and the Plan sheet's controls at their size.
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const deck = read('../screens/DeckScreen.tsx')
const css = read('../ui/v3.css')
const rule = (selector: string) => css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)))

describe('+ Add exercise on the tile (D-088 rule 1)', () => {
  const tools = deck.slice(deck.indexOf('<div className="dk-tools">'), deck.indexOf('</div>', deck.indexOf('<div className="dk-tools">')))
  it('sits directly after Swap, as a chip', () => {
    const swap = tools.indexOf("onClick={() => setSheet('swap')}")
    const add = tools.indexOf('onClick={() => setAdding(true)}')
    expect(swap).toBeGreaterThan(-1)
    expect(add).toBeGreaterThan(swap)
    const between = tools.slice(swap, add)
    expect(between.match(/<button/g) ?? []).toHaveLength(1)
    expect(tools.slice(add - 80, add)).toContain('className="chip dk-tool"')
    expect(tools.slice(add, add + 80)).toContain('+ Add exercise')
  })
  it('shows wherever Swap shows: neither button sits behind a condition', () => {
    const before = tools.slice(0, tools.indexOf("onClick={() => setSheet('swap')}"))
    expect(before.slice(before.lastIndexOf('<button'))).not.toMatch(/&&\s*\(\s*$/)
  })
  it('opens the same list as the Plan sheet, adding after the current item (D-069 rule 7)', () => {
    expect(deck).toMatch(/onAddExercise=\{\(\) => \{\s*setPlanOpen\(false\)\s*setAdding\(true\)/)
    const adding = deck.slice(deck.indexOf('if (adding) {'), deck.indexOf('// ── Swap with its own prescription'))
    expect(adding).toContain('<AddExercise')
    expect(adding).toContain('insertAfter(orderOf(deck), current.item.id, id, current.section.id)')
  })
})

describe('the cardio minutes box (D-088 rule 2)', () => {
  it('holds three digits at 56 px', () => {
    const box = rule('.cardio-panel__input')
    expect(box).toContain('width: 3ch;')
    expect(box).toContain('min-width: 3ch;')
    expect(box).toContain('padding: 0;')
    expect(box).toContain('font-variant-numeric: tabular-nums;')
    expect(box).toContain('font: 700 56px/1 var(--font-display);')
    expect(box).not.toContain('110px')
  })
})

describe('the Plan sheet keeps its controls at size (D-088 rule 1)', () => {
  it('the Add exercise chip and the footer never shrink while the list scrolls', () => {
    expect(rule('.plan-sheet__add')).toContain('flex: none;')
    expect(rule('.plan-sheet__foot')).toContain('flex: none;')
    expect(rule('.chip')).toContain('height: 44px;')
  })
})
