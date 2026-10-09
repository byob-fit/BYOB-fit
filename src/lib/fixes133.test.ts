/// <reference types="node" />
// EXEC-13.3 commit D, tasks 5a to 5c (D-092): the running hold kept in deck
// state, the hold timer's wiring in the deck, and the summary's tiles. The
// deck needs IndexedDB, so its wiring and tiles are tested as source checks
// plus the comparison they render; the browser run (task 6) covers the rest.
import 'fake-indexeddb/auto'

import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import type { Item, ItemFields, Section } from '../types/program.ts'
import type { Entry, Session } from '../types/stores.ts'
import type { DeckItem } from './session.ts'
import { compareWithLastWeek } from './summary.ts'
import { parseDeckState } from '../session/deckState.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const deck = read('../screens/DeckScreen.tsx')
/** The source from `start` up to the next `end` after it. */
function slice(start: string, end: string): string {
  const from = deck.indexOf(start)
  expect(from, start).toBeGreaterThan(-1)
  const to = deck.indexOf(end, from + start.length)
  expect(to, end).toBeGreaterThan(-1)
  return deck.slice(from, to)
}

const id = '2026-10-05__mon'

describe('the running hold in deck state (D-092 rule 2, task 5a)', () => {
  const base = { sessionId: id, restUntil: null, drafts: {}, position: 0 }
  it('keeps a valid hold', () => {
    const hold = { key: 'single-leg-stance:1:right', startedAt: 1_800_000_000_000 }
    expect(parseDeckState(id, JSON.stringify({ ...base, hold }))).toEqual({ ...base, hold })
  })
  it('ignores a malformed hold and keeps the rest', () => {
    for (const hold of [null, 'x', 12, {}, { key: 3, startedAt: 1 }, { key: 'a:1:', startedAt: '1' }, { key: 'a:1:' }, { startedAt: 1 }]) {
      expect(parseDeckState(id, JSON.stringify({ ...base, hold }))).toEqual(base)
    }
  })
  it('a running hold written and read back round-trips', async () => {
    vi.resetModules()
    const db = await import('../db/index.ts')
    await db.clearAllStores()
    const state = await import('../session/deckState.ts')
    const kept = { ...base, hold: { key: 'single-leg-stance:2:left', startedAt: 1_800_000_000_000 } }
    await state.writeDeckState(kept)
    vi.resetModules()
    const reopened = await import('../session/deckState.ts')
    expect(await reopened.readDeckState(id)).toEqual(kept)
  })
})

describe('the hold timer in the deck (D-092 rules 1 to 4, task 5b)', () => {
  const actions = slice('{holdKey && !entry?.skipped && activeN !== undefined && (', 'without the timer')
  it('both hold buttons act on holdRow, the side being held', () => {
    expect(actions).toContain('const row = holdRow')
    expect(actions).toContain('writeRow(holdRow, { seconds: holdTarget })')
  })
  it('starting a timer calls stopHolds() first', () => {
    const start = actions.slice(actions.indexOf('} else {'))
    expect(start.indexOf('stopHolds()')).toBeGreaterThan(-1)
    expect(start.indexOf('stopHolds()')).toBeLessThan(start.indexOf('holdRef.current = { [key]: startedAt }'))
    expect(start.indexOf('stopHolds()')).toBeLessThan(start.indexOf('setHoldStart({ [key]: startedAt })'))
  })
  it('focusing a running box calls stopHolds()', () => {
    const focus = slice('onFocus={(event) => {', 'onChange=')
    expect(focus).toMatch(/if \(running !== undefined\) stopHolds\(\)/)
    expect(deck).toContain('readOnly={running !== undefined}')
  })
  it('saveRow reads a running hold for its row', () => {
    const save = slice('const saveRow = useCallback(', '// "same" in any box')
    expect(save).toContain('const key = rowKey(current.item.id, row)')
    expect(save).toContain('const holdAt = holdRef.current[key]')
    expect(save).toContain('if (holdAt !== undefined) stopHolds()')
  })
})

describe('the summary tiles (D-092 rule 6, task 5c)', () => {
  const tiles = slice('<div className="compare__tiles"', '</div>')
  it('render as three buttons with aria-pressed', () => {
    expect(tiles).toContain("{(['up', 'same', 'down'] as const).map((change) => (")
    expect(tiles.match(/<button\b/g)).toHaveLength(1)
    expect(tiles).toContain('type="button"')
    expect(tiles).toContain('aria-pressed={change === shownChange}')
  })
  it('a zero-count tile is disabled', () => {
    expect(tiles).toContain('disabled={compared[change] === 0}')
  })
  it('the comparison they render can have a zero tile, and each line names its tile', () => {
    const main: Section = { id: 'main', kind: 'main', title: 'Main', items: [] }
    const item = (itemId: string, exerciseId: string): DeckItem => {
      const fields: ItemFields = { type: 'load_reps', sets: 1, repMin: 8, repMax: 12, unit: 'kg' }
      return { position: 1, section: main, item: { id: itemId, exerciseId, ...fields } as Item, resolved: { ...fields, id: itemId, exerciseId }, logged: true }
    }
    const entry = (itemId: string, exerciseId: string, weight: number): Entry => ({ itemId, exerciseId, sets: [{ n: 1, weight, reps: 10 }] })
    const session = (date: string, entries: Entry[], ended: boolean): Session => ({ id: `${date}__mon`, date, dayId: 'mon', programWeek: 1, startedAt: `${date}T09:00:00.000Z`, ...(ended ? { endedAt: `${date}T10:00:00.000Z` } : {}), entries })
    const last = session('2026-09-28', [entry('a', 'squat', 100), entry('b', 'row', 60)], true)
    const today = session('2026-10-05', [entry('a', 'squat', 105), entry('b', 'row', 60)], false)
    const c = compareWithLastWeek(today, [item('a', 'squat'), item('b', 'row')], [last, today], 'mon')
    expect([c.up, c.same, c.down]).toEqual([1, 1, 0])
    expect(c.lines.map((l) => [l.exerciseId, l.change])).toEqual([
      ['squat', 'up'],
      ['row', 'same'],
    ])
    expect(deck).toContain('compared.lines.filter((line) => line.change === shownChange)')
  })
})
