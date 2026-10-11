/// <reference types="node" />
// Small change 13.4 (D-093): skip an exercise today, remove a set, both
// counted against completeness; the Settings unit for items with none; a
// reload after End goes to Today. The deck needs IndexedDB, so its wiring is
// checked in source; the browser run covers the screens.
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { Item, ItemFields, Program, Section } from '../types/program.ts'
import type { Entry, Session } from '../types/stores.ts'
import { trainingCounts } from './scores.ts'
import { isChoiceSkip, summarise, type DeckItem } from './session.ts'
import { compareWithLastWeek } from './summary.ts'
import { changedSetCounts, isDeckItemInProgress, setRowsWithAdded } from './todayPlan.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const deckSource = read('../screens/DeckScreen.tsx')

describe('Add set and Remove set (D-093 rule 2)', () => {
  it('removes prescribed sets from the last one back, never the last one left', () => {
    expect(changedSetCounts(3, undefined, -1)).toEqual({ removedSets: 1 })
    expect(changedSetCounts(3, { removedSets: 1 }, -1)).toEqual({ removedSets: 2 })
    expect(changedSetCounts(3, { removedSets: 2 }, -1)).toEqual({ removedSets: 2 })
    expect(changedSetCounts(1, undefined, -1)).toEqual({})
  })
  it('removes an added set before any prescribed one', () => {
    expect(changedSetCounts(3, { addedSets: 2 }, -1)).toEqual({ addedSets: 1 })
    expect(changedSetCounts(3, { addedSets: 1 }, -1)).toEqual({})
  })
  it('adding brings a removed set back before adding a new one', () => {
    expect(changedSetCounts(3, { removedSets: 2 }, 1)).toEqual({ removedSets: 1 })
    expect(changedSetCounts(3, { removedSets: 1 }, 1)).toEqual({})
    expect(changedSetCounts(3, undefined, 1)).toEqual({ addedSets: 1 })
  })
  it('today’s rows drop removed sets, L and R together on per-side items', () => {
    expect(setRowsWithAdded({ sets: 3 }, undefined, 1)).toEqual([{ n: 1 }, { n: 2 }])
    expect(setRowsWithAdded({ sets: 2, perSide: true }, undefined, 1)).toEqual([{ n: 1, side: 'L' }, { n: 1, side: 'R' }])
    expect(setRowsWithAdded({ sets: 3 }, undefined, 9)).toEqual([{ n: 1 }])
    expect(setRowsWithAdded({ sets: 2 }, 1)).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }])
  })
  it('two of three sets saved and the third removed: the exercise is done, not in progress', () => {
    const main: Section = { id: 'main', kind: 'main', title: 'Main', items: [] }
    const fields: ItemFields = { type: 'load_reps', sets: 3, repMin: 8, repMax: 12, unit: 'kg' }
    const d: DeckItem = { position: 1, section: main, item: { id: 'a', exerciseId: 'squat', ...fields } as Item, resolved: { ...fields, id: 'a', exerciseId: 'squat' }, logged: true }
    const sets = [{ n: 1, weight: 100, reps: 8 }, { n: 2, weight: 100, reps: 8 }]
    const session = (entry: Entry): Session => ({ id: 's', date: '2026-10-05', dayId: 'mon', programWeek: 1, entries: [entry] })
    expect(isDeckItemInProgress(d, session({ itemId: 'a', exerciseId: 'squat', sets }))).toBe(true)
    expect(isDeckItemInProgress(d, session({ itemId: 'a', exerciseId: 'squat', sets, removedSets: 1 }))).toBe(false)
  })
  it('the deck uses today’s rows, with removed sets, wherever Done and the boxes read them', () => {
    expect(deckSource.match(/setRowsWithAdded\(current\.resolved, entry\?\.addedSets, entry\?\.removedSets\)/g)?.length).toBe(3)
    expect(deckSource).not.toContain('setRowsWithAdded(current.resolved, entry?.addedSets)')
    expect(deckSource).toContain('const canRemoveSet = setNumbers.length > 1 && !lastRows.some((row) => findSet(entry, row))')
    expect(deckSource).toContain('− Remove set {lastN}')
    expect(deckSource).not.toContain('dk-addset--remove')
  })
})

describe('Skip today (D-093 rules 1 and 5)', () => {
  it('a skip by choice is not a Discomfort skip', () => {
    expect(isChoiceSkip({ skipped: true })).toBe(true)
    expect(isChoiceSkip({ skipped: true, feltOff: 'hard' })).toBe(true)
    expect(isChoiceSkip({ skipped: true, feltOff: 'discomfort' })).toBe(false)
    expect(isChoiceSkip({})).toBe(false)
    expect(isChoiceSkip(undefined)).toBe(false)
  })
  it('is offered only while nothing is saved for the exercise, with Undo after', () => {
    expect(deckSource).toContain("const canSkip = current.logged && !isCheckTile && !entry?.skipped && (entry?.sets ?? []).length === 0")
    expect(deckSource).toContain('Skip today')
    expect(deckSource).toContain('Undo skip')
    expect(deckSource).toContain("{choiceSkipped ? 'Skipped today.' : 'Skipped today: discomfort.'}")
  })
  it('Today’s resume card never names a skipped exercise as next', () => {
    expect(read('../screens/TodayScreen.tsx')).toContain('    if (entry?.skipped) return false\n    if (deckItem.logged)')
  })
  it('the rest panel on a skipped exercise names the next exercise, not a set', () => {
    expect(deckSource).toContain(': pendingN !== undefined && !entry?.skipped')
  })
  it('a Felt off change keeps a skip by choice', () => {
    expect(read('../session/useSession.ts')).toContain("if (flag === 'discomfort' || choice) next.skipped = true")
  })
})

describe('completeness counts skips by choice and removed sets (D-093 rule 3)', () => {
  const program = {
    id: 'p',
    programWeeks: 4,
    startDate: '2026-09-28',
    exercises: { bench: { name: 'Bench' }, row: { name: 'Row' } },
    days: [0, 1, 2, 3, 4, 5, 6].map((order) => ({
      id: `d${order}`,
      order,
      name: order === 1 ? 'Day 1' : 'Rest',
      rest: order !== 1,
      sections:
        order === 1
          ? [
              {
                id: 'm1',
                kind: 'main' as const,
                title: 'Main',
                items: [
                  { id: 'm1-1', exerciseId: 'bench', type: 'load_reps' as const, sets: 3, repMin: 6, repMax: 8 },
                  { id: 'm1-2', exerciseId: 'row', type: 'load_reps' as const, sets: 2, repMin: 8, repMax: 10 },
                ],
              },
            ]
          : [],
    })),
  } as unknown as Program
  const today = new Date('2026-10-03T12:00:00')
  const mon = (entries: Entry[]): Session => ({ id: '2026-09-28__d1', date: '2026-09-28', dayId: 'd1', programWeek: 1, startedAt: '2026-09-28T09:00:00Z', endedAt: '2026-09-28T10:00:00Z', entries })
  const set = (n: number) => ({ n, weight: 60, reps: 8 })
  const counts = (entries: Entry[]) => trainingCounts({ program, changes: [], sessions: [mon(entries)], week: 1, today })

  it('two of three sets with the third removed: 4 of 5', () => {
    const c = counts([
      { itemId: 'm1-1', exerciseId: 'bench', sets: [set(1), set(2)], removedSets: 1 },
      { itemId: 'm1-2', exerciseId: 'row', sets: [set(1), set(2)] },
    ])
    expect([c.confirmed, c.prescribed]).toEqual([4, 5])
  })
  it('an exercise skipped by choice stays in both counts: 2 of 5', () => {
    const c = counts([
      { itemId: 'm1-1', exerciseId: 'bench', sets: [], skipped: true },
      { itemId: 'm1-2', exerciseId: 'row', sets: [set(1), set(2)] },
    ])
    expect([c.confirmed, c.prescribed]).toEqual([2, 5])
  })
  it('Discomfort keeps its exemption: 2 of 2', () => {
    const c = counts([
      { itemId: 'm1-1', exerciseId: 'bench', sets: [], skipped: true, feltOff: 'discomfort' },
      { itemId: 'm1-2', exerciseId: 'row', sets: [set(1), set(2)] },
    ])
    expect([c.confirmed, c.prescribed]).toEqual([2, 2])
  })
})

describe('the summary names what was skipped and removed (D-093 rule 4)', () => {
  it('counts removed sets and skips by choice', () => {
    const main: Section = { id: 'main', kind: 'main', title: 'Main', items: [] }
    const item = (id: string, sets: number): DeckItem => {
      const fields: ItemFields = { type: 'load_reps', sets, repMin: 8, repMax: 12 }
      return { position: 1, section: main, item: { id, exerciseId: id, ...fields } as Item, resolved: { ...fields, id, exerciseId: id }, logged: true }
    }
    const session: Session = {
      id: 's',
      date: '2026-10-05',
      dayId: 'mon',
      programWeek: 1,
      entries: [
        { itemId: 'a', exerciseId: 'a', sets: [{ n: 1, weight: 50, reps: 8 }], removedSets: 2 },
        { itemId: 'b', exerciseId: 'b', sets: [], skipped: true },
      ],
    }
    const summary = summarise(session, [item('a', 3), item('b', 3)])
    expect(summary.removed).toBe(2)
    expect(summary.skippedByChoice).toBe(1)
    expect(summary.skipped).toBe(1)
    expect(deckSource).toContain("'set' : 'sets'} removed`")
  })
})

describe('items with no unit use the Settings unit (D-093 rule 6)', () => {
  const main: Section = { id: 'main', kind: 'main', title: 'Main', items: [] }
  const fields: ItemFields = { type: 'load_reps', sets: 1, repMin: 8, repMax: 12 }
  const d: DeckItem = { position: 1, section: main, item: { id: 'a', exerciseId: 'squat', ...fields } as Item, resolved: { ...fields, id: 'a', exerciseId: 'squat' }, logged: true }
  const session = (date: string, weight: number, ended: boolean): Session => ({ id: `${date}__mon`, date, dayId: 'mon', programWeek: 1, startedAt: `${date}T09:00:00.000Z`, ...(ended ? { endedAt: `${date}T10:00:00.000Z` } : {}), entries: [{ itemId: 'a', exerciseId: 'squat', sets: [{ n: 1, weight, reps: 10 }] }] })
  const last = session('2026-09-28', 520, true)
  const now = session('2026-10-05', 525, false)
  it('the comparison lines read lb when Settings says lb', () => {
    const c = compareWithLastWeek(now, [d], [last, now], 'mon', 'lb')
    expect(c.lines[0]).toMatchObject({ today: '525 lb × 10', last: '520 lb × 10' })
  })
  it('an item’s own unit still wins', () => {
    const withUnit: DeckItem = { ...d, resolved: { ...d.resolved, unit: 'kg' } }
    expect(compareWithLastWeek(now, [withUnit], [last, now], 'mon', 'lb').lines[0].today).toBe('525 kg × 10')
  })
  it('Ready to progress takes the same unit from both callers', () => {
    for (const path of ['../screens/DeckScreen.tsx', '../screens/TodayScreen.tsx']) expect(read(path), path).toMatch(/readyToProgress\([^\n]*, unitsOf\(settings\)\)/)
  })
  it('no screen falls back to kg for an item’s unit', () => {
    for (const path of ['../screens/DeckScreen.tsx', '../screens/TodayScreen.tsx', '../screens/LogScreen.tsx', '../screens/ProgressScreen.tsx', './summary.ts']) {
      const source = read(path)
      expect(source, path).not.toMatch(/\.unit \?\? 'kg'/)
      expect(source, path).not.toMatch(/resolved\.unit \?\? 'kg'/)
    }
    expect(read('../screens/LogScreen.tsx')).not.toContain("  return 'kg'\n")
  })
})

describe('a reload after End goes to Today (D-093 rule 7)', () => {
  it('the deck of an ended session redirects', () => {
    expect(deckSource).toContain("if (phase === 'deck' && !api.loading && api.session?.endedAt) navigate('/', { replace: true })")
  })
})
