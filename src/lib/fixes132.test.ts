/// <reference types="node" />
// EXEC-13.2 commit C, tasks 4b to 4e (D-089): scores start at the first entry
// (SCORES.md Part 1 rule 7), the Not started calendar state, and the shared
// chart on the exercise page.
import { readFileSync } from 'node:fs'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Program } from '../types/program.ts'
import type { MealDay, Session } from '../types/stores.ts'
import { LineChart } from '../ui/charts.tsx'
import { weekDates } from './program.ts'
import { combine, countedDates, nutritionStart, trainingCounts, trainingParts, trainingStart } from './scores.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const iso = (dates: Date[]) => dates.map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)

const s = (date: string, dayId: string, entries: Session['entries'], ended = true): Session => ({
  id: `${date}__${dayId}`,
  date,
  dayId,
  programWeek: 1,
  startedAt: `${date}T09:00:00Z`,
  ...(ended ? { endedAt: `${date}T10:00:00Z` } : {}),
  entries,
})
const set = (n: number, weight: number, reps: number) => ({ n, weight, reps })

// Every day trains: one main item of one set, so a date is finished by one confirmed set.
const program = (startDate: string, programWeeks: number): Program =>
  ({
    schemaVersion: 2,
    id: 'p',
    name: 'Test',
    weekStartsOn: 'sunday',
    programWeeks,
    startDate,
    exercises: { bench: { name: 'Bench' } },
    days: [0, 1, 2, 3, 4, 5, 6].map((order) => ({
      id: `d${order}`,
      order,
      name: `Day ${order}`,
      rest: false,
      sections: [
        { id: `m${order}`, kind: 'main' as const, title: 'Main', items: [{ id: `m${order}-1`, exerciseId: 'bench', type: 'load_reps' as const, sets: 1, repMin: 6, repMax: 8 }] },
      ],
    })),
  }) as unknown as Program

const done = (date: string, order: number) => s(date, `d${order}`, [{ itemId: `m${order}-1`, exerciseId: 'bench', sets: [set(1, 60, 8)] }])

describe('countedDates with a start date (Part 1 rule 7)', () => {
  // Week 1 of a program starting Sunday Sep 27, 2026; today is Saturday Oct 3.
  const week = weekDates(program('2026-09-27', 4), 1)
  const today = new Date('2026-10-03T12:00:00')
  it('without a start: unchanged, every date up to today', () => {
    expect(iso(countedDates(week, today))).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'])
    expect(iso(countedDates(week, new Date('2026-09-29T12:00:00')))).toEqual(['2026-09-27', '2026-09-28', '2026-09-29'])
  })
  it('with a start date: from that date on, the start date included', () => {
    expect(iso(countedDates(week, today, '2026-09-30'))).toEqual(['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'])
    expect(iso(countedDates(week, new Date('2026-10-01T12:00:00'), '2026-09-30'))).toEqual(['2026-09-30', '2026-10-01'])
  })
  it('null: not started, nothing counted', () => {
    expect(countedDates(week, today, null)).toEqual([])
  })
})

describe('trainingStart and nutritionStart (D-089)', () => {
  it('training starts at the earliest finished workout', () => {
    expect(trainingStart([done('2026-10-01', 4), done('2026-09-29', 2)])).toBe('2026-09-29')
  })
  it('ignores unfinished sessions and ended empty sessions', () => {
    const unfinished = s('2026-09-27', 'd0', [{ itemId: 'm0-1', exerciseId: 'bench', sets: [set(1, 60, 8)] }], false)
    const empty = s('2026-09-28', 'd1', [])
    expect(trainingStart([unfinished, empty, done('2026-09-30', 3)])).toBe('2026-09-30')
    expect(trainingStart([unfinished, empty])).toBeNull()
    expect(trainingStart([])).toBeNull()
  })
  it('nutrition starts at the first day with parsed items', () => {
    const parsed = (date: string): MealDay => ({ date, lines: ['x'], parsed: { kcal: 500, proteinG: 30, items: [{ line: 'x', kcal: 500, proteinG: 30 }] } })
    const typedOnly: MealDay = { date: '2026-09-27', lines: ['eggs'] }
    const noItems: MealDay = { date: '2026-09-28', lines: ['x'], parsed: { kcal: 0, proteinG: 0, items: [] } }
    expect(nutritionStart([parsed('2026-10-02'), typedOnly, noItems, parsed('2026-09-30')])).toBe('2026-09-30')
    expect(nutritionStart([typedOnly, noItems])).toBeNull()
  })
})

describe('SCORES.md Part 1 rule 7 worked example', () => {
  // Week 1 starts Sunday Aug 2, 2026, so week 8 is Sep 20 to 26; its Wednesday is Sep 23.
  const p = program('2026-08-02', 12)
  const sessions = [done('2026-09-23', 3), done('2026-09-24', 4), done('2026-09-25', 5), done('2026-09-26', 6)]
  const today = new Date('2026-09-27T12:00:00')
  const start = trainingStart(sessions)
  const score = (week: number) => combine(trainingParts(trainingCounts({ program: p, changes: [], sessions, week, today, start }), null))
  it('the first finished workout is Wednesday of week 8', () => {
    expect(start).toBe('2026-09-23')
    expect(iso(weekDates(p, 8))[3]).toBe('2026-09-23')
  })
  it('weeks 1 to 7 have no training score: a gap, never 0', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(score)).toEqual([null, null, null, null, null, null, null])
    // Without the rule, the same weeks would be scored 0 for being missed.
    expect(combine(trainingParts(trainingCounts({ program: p, changes: [], sessions, week: 1, today }), null))).toBe(0)
  })
  it("week 8's adherence is 4 ÷ 4, not 4 ÷ 7", () => {
    const c = trainingCounts({ program: p, changes: [], sessions, week: 8, today, start })
    expect({ planned: c.planned, finished: c.finished }).toEqual({ planned: 4, finished: 4 })
    expect(trainingParts(c, null)[0].value).toBe(1)
    expect(trainingCounts({ program: p, changes: [], sessions, week: 8, today }).planned).toBe(7)
  })
})

describe('the workouts-done calendar state (D-089 rule 3)', () => {
  // The state expression is taken from the screen's source and run on its own.
  const screen = read('../screens/ProgressScreen.tsx')
  const line = screen.split('\n').find((l) => l.includes('const state = day.rest'))!
  const expr = line.slice(line.indexOf('const state = ') + 'const state = '.length).trim()
  const state = new Function('day', 'done', 'iso', 'todayIso', 'start', `return ${expr}`) as (
    day: { rest: boolean },
    done: boolean,
    iso: string,
    todayIso: string,
    start: string | null,
  ) => string
  const today = '2026-10-03'
  const start = trainingStart([done('2026-09-30', 3)])
  const train = { rest: false }
  const rest = { rest: true }
  it('a training date before the first finished workout is Not started; after it, Missed', () => {
    expect(state(train, false, '2026-09-28', today, start)).toBe('notstarted')
    expect(state(train, false, '2026-10-01', today, start)).toBe('missed')
  })
  it('with no finished workout yet, every past training date is Not started', () => {
    expect(state(train, false, '2026-10-01', today, trainingStart([s('2026-09-28', 'd1', [])]))).toBe('notstarted')
  })
  it('rest days stay Rest; done, today and future dates are unchanged', () => {
    expect(state(rest, false, '2026-09-28', today, start)).toBe('rest')
    expect(state(rest, false, '2026-10-01', today, start)).toBe('rest')
    expect(state(rest, false, '2026-09-28', today, null)).toBe('rest')
    expect(state(train, true, '2026-09-30', today, start)).toBe('done')
    expect(state(train, false, today, today, start)).toBe('future')
    expect(state(train, false, '2026-10-05', today, null)).toBe('future')
  })
  it('the calendar draws Not started dashed, and the legend lists it', () => {
    expect(screen).toContain("{ label: 'Not started', tone: 'line', dashed: true }")
    const css = read('../ui/v3.css')
    const rule = css.slice(css.indexOf('.calendar__cell--notstarted {'), css.indexOf('}', css.indexOf('.calendar__cell--notstarted {')))
    expect(rule).toContain('border: 1.5px dashed var(--line);')
  })
})

describe('the exercise page uses the shared chart (D-089 rule 2)', () => {
  it('renders LineChart for Top-set weight; the old stretched sparkline is gone', () => {
    const log = read('../screens/LogScreen.tsx')
    expect(log).toContain("import { LineChart } from '../ui/charts.tsx'")
    expect(log).toContain('<LineChart series={[{ points: series, tone: \'sage\' }]} height={56} label="Top-set weight" />')
    expect(log).not.toMatch(/function Sparkline/)
    expect(log).not.toContain('<Sparkline')
  })
  it('a single point is centred and fully inside the chart', () => {
    const html = renderToStaticMarkup(createElement(LineChart, { series: [{ points: [{ date: '2026-09-28', value: 60 }], tone: 'sage' }], height: 56, label: 'Top-set weight' }))
    const viewBox = html.match(/viewBox="0 0 (\d+) (\d+)"/)!
    const [width, height] = [Number(viewBox[1]), Number(viewBox[2])]
    const circle = html.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" class="chart__point"/)!
    const [cx, cy, r] = [Number(circle[1]), Number(circle[2]), Number(circle[3])]
    expect(cx).toBe(width / 2)
    expect(cy).toBe(height / 2)
    expect(cx - r).toBeGreaterThan(0)
    expect(cx + r).toBeLessThan(width)
    expect(cy - r).toBeGreaterThan(0)
    expect(cy + r).toBeLessThan(height)
  })
})
