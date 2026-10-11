// D-095: the program list, the one-time stamp and the week timeline across programs.
import { describe, expect, it } from 'vitest'

import type { Program } from '../types/program.ts'
import { entryFor, historyOrActive, numberOfSession, parseHistory, segments, stampFor, weekRefs, type ProgramEntry } from './programHistory.ts'

const day = (id: string, order: number) => ({ id, order, name: id, rest: order === 0, sections: [] })
const program = (id: string, startDate: string, programWeeks: number, dayIds = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']): Program =>
  ({ id, name: id, startDate, programWeeks, exercises: {}, days: dayIds.map((d, i) => day(d, i)) }) as unknown as Program
const entry = (programId: string, n: number, baseId = programId): ProgramEntry => ({ programId, baseId, n, activatedAt: '2026-10-01T00:00:00.000Z' })

describe('the program list (rules 6 and 7)', () => {
  it('parses only well-formed entries', () => {
    expect(parseHistory(undefined)).toEqual([])
    expect(parseHistory('not json')).toEqual([])
    expect(parseHistory(JSON.stringify([entry('a', 1), { programId: 'b' }, entry('c', 0)]))).toEqual([entry('a', 1)])
  })
  it('numbers activations in order; the first is program 1', () => {
    const now = new Date('2026-10-11T08:00:00Z')
    expect(entryFor([], null, { programId: 'a', baseId: 'a', startDate: '2026-07-05' }, now).n).toBe(1)
    const a = program('a', '2026-07-05', 12)
    expect(entryFor([entry('a', 1)], a, { programId: 'b', baseId: 'b', startDate: '2026-09-27' }, now).n).toBe(2)
  })
  it('the same file id and start date as the active program is an edited version with the same number', () => {
    const a = program('a', '2026-07-05', 12)
    const now = new Date()
    expect(entryFor([entry('a', 1)], a, { programId: 'a-2', baseId: 'a', startDate: '2026-07-05' }, now).n).toBe(1)
    expect(entryFor([entry('a', 1)], a, { programId: 'a-2', baseId: 'a', startDate: '2026-09-27' }, now).n).toBe(2)
  })
  it('without a list, the active program alone is program 1', () => {
    expect(historyOrActive([], program('a', '2026-07-05', 12)).map((e) => [e.programId, e.n])).toEqual([['a', 1]])
    expect(historyOrActive([], null)).toEqual([])
  })
})

describe('the one-time stamp (owner’s design, rule 5 as fallback)', () => {
  const active = program('a', '2026-07-05', 12)
  const other = program('b', '2026-01-04', 8, ['x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6'])
  it('a session whose day is in the active program gets the active program', () => {
    expect(stampFor({ date: '2026-08-03', dayId: 'mon' }, active, [active, other])).toBe('a')
  })
  it('otherwise the stored program holding that day', () => {
    expect(stampFor({ date: '2026-02-02', dayId: 'x1' }, active, [active, other])).toBe('b')
  })
  it('a day no program holds falls back to the active program', () => {
    expect(stampFor({ date: '2026-02-02', dayId: 'zzz' }, active, [active, other])).toBe('a')
  })
})

describe('weeks across programs (rules 3 and 6)', () => {
  const a = program('a', '2026-07-05', 12)
  const b = program('b', '2026-09-27', 8)
  const segs = segments([entry('a', 1), entry('b', 2)], [a, b])
  const today = new Date('2026-10-11T12:00:00')
  it('the old program runs to the new one’s start date', () => {
    expect(segs.map((s) => [s.n, s.from, s.until])).toEqual([[1, '2026-07-05', '2026-09-27'], [2, '2026-09-27', null]])
  })
  it('lists every week, old then new, with labels', () => {
    const refs = weekRefs(segs, today)
    expect(refs.length).toBe(12 + 3)
    expect(refs[11].label).toBe('Program 1 · Week 12')
    expect(refs[12].label).toBe('Program 2 · Week 1')
    expect(refs[14].short).toBe('3')
    expect(refs[14].compact).toBe('P2 · Week 3')
    expect(refs.filter((r) => r.heading).map((r) => r.heading)).toEqual(['Program 1', 'Program 2'])
  })
  it('an old program replaced mid-way ends with its actual last week', () => {
    const early = segments([entry('a', 1), entry('c', 2)], [a, program('c', '2026-09-13', 8)])
    const refs = weekRefs(early, today)
    expect(refs.filter((r) => r.n === 1).length).toBe(10)
    expect(refs.find((r) => r.n === 1 && r.week === 10)?.until).toBe('2026-09-13')
  })
  it('one program keeps the plain labels', () => {
    const refs = weekRefs(segments([entry('b', 1)], [b]), today)
    expect(refs.map((r) => r.label)).toEqual(['Week 1', 'Week 2', 'Week 3'])
    expect(refs.some((r) => r.heading)).toBe(false)
    expect(refs[2].compact).toBe('Week 3')
  })
  it('an edited version keeps its number and replaces the definition', () => {
    const a2 = { ...program('a-2', '2026-07-05', 14) }
    const s = segments([entry('a', 1), entry('a-2', 1, 'a')], [a, a2])
    expect(s.map((x) => [x.n, x.program.id])).toEqual([[1, 'a-2']])
  })
  it('a program replaced before its own start date has no weeks', () => {
    const s = segments([entry('a', 1), entry('d', 2), entry('b', 3)], [a, program('d', '2026-10-25', 8), b])
    expect(s.map((x) => x.n)).toEqual([1, 3])
  })
  it('a session counts under its stamp, else under the program in force on its date', () => {
    const history = [entry('a', 1), entry('b', 2)]
    expect(numberOfSession({ date: '2026-09-28', programId: 'a' }, history, segs)).toBe(1)
    expect(numberOfSession({ date: '2026-09-28' }, history, segs)).toBe(2)
    expect(numberOfSession({ date: '2026-09-20' }, history, segs)).toBe(1)
  })
})
