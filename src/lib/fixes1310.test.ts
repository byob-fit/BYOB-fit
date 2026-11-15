// Small change 13.10: Add from the library (D-102), progression history
// (D-103) and ending an earlier open session (D-104).

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { canEndLate } from './dayChanges.ts'
import { suggestProgression } from './progression.ts'
import { addPrefill, addedDeckItems, keepAddedInProgram, libraryAddedEntry, progressionHistory } from './sessionExercises.ts'
import type { Program } from '../types/program.ts'
import type { Entry, Session } from '../types/stores.ts'

const program = JSON.parse(readFileSync('public/templates/starter-3day-fullbody.json', 'utf8')) as Program
const day = program.days.find((d) => !d.rest)!
const main = day.sections.find((s) => s.kind === 'main')!
const item = main.items.find((i) => (i.type ?? 'load_reps') === 'load_reps' && i.repMax !== undefined)!
const itemIds = new Set(program.days.flatMap((d) => d.sections.flatMap((s) => s.items.map((i) => i.id))))
const monday = new Date(2026, 10, 9)

const sets = (weight: number, reps: number, count: number) => Array.from({ length: count }, (_, i) => ({ n: i + 1, weight, reps }))
const session = (date: string, entries: Entry[], extra: Partial<Session> = {}): Session => ({ id: `${date}:${day.id}`, date, dayId: day.id, programWeek: 1, entries, ...extra })
const top = (itemId = item.id): Entry => ({ itemId, exerciseId: item.exerciseId, sets: sets(50, item.repMax!, item.sets ?? 3) })

describe('D-103 progression history', () => {
  it('ignores a session in which the exercise was skipped by choice with nothing logged', () => {
    const skipped: Entry = { itemId: item.id, exerciseId: item.exerciseId, sets: [], skipped: true }
    const history = [session('2026-11-02', [top()]), session('2026-11-04', [top()]), session('2026-11-06', [skipped])]
    const past = progressionHistory(history, item.id, item.exerciseId, '2026-11-09', itemIds)
    expect(past).toHaveLength(2)
    expect(suggestProgression(item, program.exercises[item.exerciseId], past, 'kg')?.kind).toBe('weight')
  })

  it('still counts a Discomfort skip, which blocks the suggestion', () => {
    const hurt: Entry = { itemId: item.id, exerciseId: item.exerciseId, sets: [], skipped: true, feltOff: 'discomfort' }
    const past = progressionHistory([session('2026-11-02', [top()]), session('2026-11-04', [top()]), session('2026-11-06', [hurt])], item.id, item.exerciseId, '2026-11-09', itemIds)
    expect(past).toHaveLength(3)
    expect(suggestProgression(item, program.exercises[item.exerciseId], past, 'kg')).toBeNull()
  })

  it('counts the same exercise under an earlier program’s item, newest first with the item’s own', () => {
    const history = [session('2026-10-20', [top('old-07')]), session('2026-10-27', [top('old-07')]), session('2026-11-04', [top()])]
    const past = progressionHistory(history, item.id, item.exerciseId, '2026-11-09', itemIds)
    expect(past.map((e) => e.itemId)).toEqual([item.id, 'old-07', 'old-07'])
    expect(progressionHistory(history, item.id, item.exerciseId, '2026-11-09')).toHaveLength(1)
  })

  it('does not borrow from another item of this program, an added exercise or a changed one', () => {
    const other = [...itemIds].find((id) => id !== item.id)!
    const history = [
      session('2026-11-02', [top(other)]),
      session('2026-11-03', [{ ...top('added-1'), added: { fromItemId: '' } }]),
      session('2026-11-04', [{ ...top('old-07'), changed: true }]),
    ]
    expect(progressionHistory(history, item.id, item.exerciseId, '2026-11-09', itemIds)).toHaveLength(0)
  })
})

describe('D-102 an exercise added from the library', () => {
  const fields = { type: 'load_reps' as const, sets: 2, repMin: 10, repMax: 15, restSec: 60, unit: 'lb' as const }
  const entry = libraryAddedEntry('machine-row', { ...fields, exerciseId: 'machine-row' }, 'added-1')

  it('is an added entry with its own prescription and no source item', () => {
    expect(entry).toEqual({ itemId: 'added-1', exerciseId: 'machine-row', sets: [], added: { fromItemId: '' }, fields })
  })

  it('logs in the section it was added into today', () => {
    const open = session('2026-11-09', [entry], { order: [{ itemId: 'added-1', sectionId: main.id }] })
    const [deckItem] = addedDeckItems(open, program, day)
    expect(deckItem.section.id).toBe(main.id)
    expect(deckItem.logged).toBe(true)
    expect(deckItem.resolved).toMatchObject({ id: 'added-1', exerciseId: 'machine-row', sets: 2, repMax: 15 })
  })

  it('is kept in the program with that prescription once the program holds the exercise', () => {
    const order = [{ itemId: main.items[0].id, sectionId: main.id }, { itemId: 'added-1', sectionId: main.id }]
    expect(keepAddedInProgram(program, day.id, order, entry)).toEqual(program)
    const held: Program = { ...program, exercises: { ...program.exercises, 'machine-row': { name: 'Seated machine row', howTo: '' } } }
    const kept = keepAddedInProgram(held, day.id, order, entry)
    const items = kept.days.find((d) => d.id === day.id)!.sections.find((s) => s.id === main.id)!.items
    expect(items).toHaveLength(main.items.length + 1)
    expect(items[1]).toMatchObject({ exerciseId: 'machine-row', type: 'load_reps', sets: 2, repMin: 10, repMax: 15, restSec: 60, unit: 'lb' })
    expect(itemIds.has(items[1].id)).toBe(false)
  })
})

describe('D-102 the Add step’s starting values', () => {
  it('come from the program when it has the exercise', () => {
    const filled = addPrefill(program, item.exerciseId, program.exercises[item.exerciseId], 1, monday, 'lb')
    expect(filled.from).toBe('elsewhere')
    expect(filled.fields).toMatchObject({ exerciseId: item.exerciseId, repMax: item.repMax })
  })

  it('are common values by kind otherwise, and never a weight', () => {
    expect(addPrefill(program, 'x', { name: 'X', howTo: '', equipment: 'machine' }, 1, monday, 'lb')).toEqual({ from: 'default', fields: { type: 'load_reps', sets: 3, repMin: 8, repMax: 12, restSec: 90, unit: 'lb' } })
    expect(addPrefill(program, 'x', { name: 'X', howTo: '', equipment: 'cardio_machine' }, 1, monday, 'kg').fields).toEqual({ type: 'cardio_block', minutes: 20 })
    expect(addPrefill(program, 'x', { name: 'X', howTo: '', equipment: 'none' }, 1, monday, 'kg').fields).toEqual({ type: 'bodyweight_reps', sets: 3, repMin: 8, repMax: 12, restSec: 60 })
    expect(addPrefill(program, 'x', undefined, 1, monday, 'kg').fields.type).toBe('load_reps')
  })
})

describe('D-104 ending an earlier open session', () => {
  const logged = session('2026-11-10', [top()])

  it('is offered for an earlier date with something logged and no end', () => {
    expect(canEndLate(logged, '2026-11-14')).toBe(true)
    expect(canEndLate({ ...logged, entries: [{ itemId: 'w', exerciseId: 'w', sets: [], checked: true }] }, '2026-11-14')).toBe(true)
  })

  it('is not offered today, for an ended session, an empty one or none', () => {
    expect(canEndLate(logged, '2026-11-10')).toBe(false)
    expect(canEndLate({ ...logged, endedAt: '2026-11-10T18:00:00.000Z' }, '2026-11-14')).toBe(false)
    expect(canEndLate({ ...logged, entries: [{ itemId: item.id, exerciseId: item.exerciseId, sets: [] }] }, '2026-11-14')).toBe(false)
    expect(canEndLate(undefined, '2026-11-14')).toBe(false)
  })
})
