// D-097: what an AI update sends. One fixed shape at every privacy level:
// the program as prescribed this week, two weeks of logged numbers, the goal,
// current weight (and body fat when known) and the user's rules when written.
// Pure: no storage, no clock.

import type { LoadUnit, Program } from '../types/program.ts'
import type { BodyEntry, Goals, Session } from '../types/stores.ts'
import { toISODate } from './dates.ts'
import { fromGoals, goalSummary } from './goals.ts'
import { resolveItem, weekDates } from './program.ts'
import type { Proposal } from './reprogram.ts'
import { isSetConfirmed } from './session.ts'

export interface UpdateBody {
  weight: number
  unit: LoadUnit
  /** YYYY-MM-DD of the reading. */
  date: string
  bodyFatPct?: number
}

export interface UpdateFollowUp {
  previous: Proposal
  instruction: string
}

export interface UpdateInput {
  program: Program
  week: number
  startedDayIds: string[]
  goals: Goals | null
  body: UpdateBody | null
  rules: string
  /** Already narrowed by updateSessions. */
  sessions: Session[]
  /** The Settings unit, for items without their own (D-093 rule 6). */
  units: LoadUnit
  followUp?: UpdateFollowUp
}

/** D-097 rule 2: the latest body entry with a weight, else the goal's current stats. Fat % comes from the same source. */
export function currentBody(entries: BodyEntry[], goals: Goals | null | undefined): UpdateBody | null {
  const latest = [...entries].filter((e) => typeof e.weight === 'number').sort((a, b) => b.date.localeCompare(a.date))[0]
  if (latest && latest.weight !== undefined) {
    return { weight: latest.weight, unit: latest.units, date: latest.date, ...(latest.bodyFatPct !== undefined ? { bodyFatPct: latest.bodyFatPct } : {}) }
  }
  const stats = goals?.currentStats
  if (stats?.weight === undefined) return null
  return {
    weight: stats.weight,
    unit: stats.weightUnit ?? 'kg',
    date: goals!.updatedAt.slice(0, 10),
    ...(stats.bodyFatPct !== undefined ? { bodyFatPct: stats.bodyFatPct } : {}),
  }
}

/** D-097 rules 1 and 2: what stops an update before anything is sent. */
export function updateBlocker(goals: Goals | null | undefined, body: UpdateBody | null): 'goal' | 'weight' | null {
  if (!goals) return 'goal'
  if (!body) return 'weight'
  return null
}

/** D-097 rule 3: finished sessions of this program from last program week and this one. */
export function updateSessions(program: Program, week: number, sessions: Session[]): Session[] {
  const from = toISODate(weekDates(program, Math.max(1, week - 1))[0])
  const to = toISODate(weekDates(program, week)[6])
  return sessions
    .filter((s) => s.endedAt && s.date >= from && s.date <= to && (s.programId === undefined || s.programId === program.id))
    .sort((a, b) => a.date.localeCompare(b.date))
}

const PRESCRIPTION = ['sets', 'repMin', 'repMax', 'holdSec', 'distanceM', 'minutes', 'restSec', 'perSide', 'alternateExerciseId'] as const

/** D-097 rule 4: this week's prescription; no how-to, cues, notes, muscles, equipment or retired items. */
export function updateProgram(program: Program, week: number, units: LoadUnit) {
  const days = [...program.days]
    .sort((a, b) => a.order - b.order)
    .map((day) => {
      if (day.rest) return { id: day.id, name: day.name, rest: true }
      return {
        id: day.id,
        name: day.name,
        sections: day.sections.map((section) => ({
          id: section.id,
          title: section.title,
          items: section.items
            .filter((item) => !item.retiredFrom)
            .map((item) => {
              const r = resolveItem(item, week)
              const exerciseId = r.exerciseId ?? item.exerciseId
              const out: Record<string, unknown> = { id: r.id, exerciseId, exercise: program.exercises[exerciseId]?.name ?? exerciseId, type: r.type ?? item.type }
              for (const key of PRESCRIPTION) if (r[key] !== undefined) out[key] = r[key]
              if (r.sets !== undefined) out.unit = r.unit ?? units
              return out
            }),
        })),
      }
    })
  // Every exercise the program knows, by name only, so a swap can name a real id.
  const exercises = Object.fromEntries(Object.entries(program.exercises).map(([id, e]) => [id, e.name]))
  return { exercises, days }
}

/** D-097 rule 3: per set, only the numbers logged; entries with no confirmed numbers are left out. */
export function updateLogged(program: Program, sessions: Session[]) {
  const itemExercise = new Map<string, string>()
  for (const day of program.days) for (const section of day.sections) for (const item of section.items) itemExercise.set(item.id, item.exerciseId)
  return sessions
    .map((session) => ({
      date: session.date,
      dayId: session.dayId,
      entries: session.entries
        .map((entry) => {
          const sets = entry.sets.filter(isSetConfirmed).map((set) => {
            const out: Record<string, unknown> = {}
            if (set.side) out.side = set.side
            for (const key of ['weight', 'reps', 'seconds', 'distanceM', 'minutes'] as const) if (set[key] !== undefined) out[key] = set[key]
            return out
          })
          return {
            itemId: entry.itemId,
            ...(itemExercise.get(entry.itemId) !== entry.exerciseId ? { exerciseId: entry.exerciseId } : {}),
            sets,
          }
        })
        .filter((entry) => entry.sets.some((set) => Object.keys(set).some((k) => k !== 'side'))),
    }))
    .filter((session) => session.entries.length > 0)
}

function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

export function buildUpdatePayload(input: UpdateInput): { summary: { label: string; value: string }[]; message: string } {
  const { program, week, goals, body, followUp } = input
  const rules = input.rules.trim()
  const sentProgram = updateProgram(program, week, input.units)
  const logged = updateLogged(program, input.sessions)
  const training = sentProgram.days.filter((d) => !d.rest)
  const items = training.reduce((n, d) => n + (d.sections ?? []).reduce((m, s) => m + s.items.length, 0), 0)
  const sets = logged.reduce((n, s) => n + s.entries.reduce((m, e) => m + e.sets.length, 0), 0)
  const ruleLines = rules ? rules.split('\n').filter((l) => l.trim()).length : 0

  const message: Record<string, unknown> = {
    task: 'update',
    week,
    startedDayIds: input.startedDayIds,
    goal: goals ? { items: goals.items, timeframeWeeks: goals.timeframeWeeks, startDate: goals.startDate } : null,
    body,
  }
  if (rules) message.rules = rules
  message.program = sentProgram
  message.logged = logged
  if (followUp) message.followUp = { previous: followUp.previous, instruction: followUp.instruction }

  const summary = [
    { label: 'Program', value: `${count(training.length, 'training day')}, ${count(items, 'exercise')}` },
    { label: 'Logged', value: `${count(sets, 'set')} from ${count(logged.length, 'session')}, ${week > 1 ? 'last week and this week' : 'this week'}` },
    { label: 'Goal', value: goals ? goalSummary(fromGoals(goals), goals.timeframeWeeks, (id) => program.exercises[id]?.name).replace(/\.$/, '') : 'No goal set' },
    { label: 'Current weight', value: body ? `${body.weight} ${body.unit} on ${body.date}` : 'Not set' },
    { label: 'Body fat', value: body?.bodyFatPct !== undefined ? `${body.bodyFatPct}%` : 'Not set' },
    { label: 'Your training rules', value: ruleLines ? count(ruleLines, 'line') : 'None' },
  ]
  if (followUp) summary.push({ label: 'Your request', value: `“${followUp.instruction}”` })
  return { summary, message: JSON.stringify(message, null, 2) }
}
