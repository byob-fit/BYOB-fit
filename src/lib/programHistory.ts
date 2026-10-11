// D-095: progress kept across program imports. Each session carries the
// stored program it was logged under (rule 1); programs are numbered in
// activation order in a list kept in the meta store (rule 6), which backups
// already carry. No database version change. Pure functions only.

import type { Program } from '../types/program.ts'
import type { Session } from '../types/stores.ts'
import { toISODate } from './dates.ts'
import { currentWeek, weekDates } from './program.ts'

/** The meta key holding the program list, stored as JSON text (meta values are text). */
export const PROGRAM_HISTORY_KEY = 'programHistory'

/** One activation: which stored program, the file id it came from, and its number. */
export interface ProgramEntry {
  /** The stored program's id (a version: rule 2 keeps every version under its own id). */
  programId: string
  /** The id the program had before any renaming; an import with this id and the same start date is an edit (rule 7). */
  baseId: string
  /** Program number, in activation order from 1 (rule 6). Edited versions share it (rule 7). */
  n: number
  /** ISO date-time of the activation. */
  activatedAt: string
}

export function parseHistory(raw: unknown): ProgramEntry[] {
  if (typeof raw !== 'string') return []
  try {
    const list = JSON.parse(raw) as unknown
    if (!Array.isArray(list)) return []
    return list.filter(
      (e): e is ProgramEntry =>
        typeof e === 'object' && e !== null && typeof e.programId === 'string' && typeof e.baseId === 'string' && Number.isInteger(e.n) && e.n >= 1 && typeof e.activatedAt === 'string',
    )
  } catch {
    return []
  }
}

/**
 * The entry for activating `incoming` (rule 7): the same file id and the same
 * start date as the active program make an edited version with the same
 * number; anything else is the next program.
 */
export function entryFor(history: ProgramEntry[], active: Program | null | undefined, incoming: { programId: string; baseId: string; startDate: string }, now: Date): ProgramEntry {
  const last = history[history.length - 1]
  const edit = last !== undefined && active !== null && active !== undefined && last.programId === active.id && last.baseId === incoming.baseId && active.startDate === incoming.startDate
  const n = edit ? last.n : Math.max(0, ...history.map((e) => e.n)) + 1
  return { programId: incoming.programId, baseId: incoming.baseId, n, activatedAt: now.toISOString() }
}

/**
 * The one-time stamp for a session saved before D-095 (the owner's design,
 * with rule 5 as the fallback): the program active at the update when its
 * days include the session's day, otherwise the stored program whose days do,
 * latest start date on or before the session's date first.
 */
export function stampFor(session: Pick<Session, 'date' | 'dayId'>, active: Program, programs: Program[]): string {
  if (active.days.some((d) => d.id === session.dayId)) return active.id
  const matching = programs
    .filter((p) => p.days.some((d) => d.id === session.dayId))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
  return (matching.find((p) => p.startDate <= session.date) ?? matching[0] ?? active).id
}

/** A run of dates under one program number (rule 3): from its start date up to the next one's. */
export interface Segment {
  n: number
  /** The latest stored version with this number. */
  program: Program
  /** YYYY-MM-DD, the program's start date. */
  from: string
  /** YYYY-MM-DD, exclusive: the next program's start date; null for the last. */
  until: string | null
}

export function segments(history: ProgramEntry[], programs: Program[]): Segment[] {
  const byId = new Map(programs.map((p) => [p.id, p]))
  const order: number[] = []
  const latest = new Map<number, Program>()
  for (const entry of history) {
    const program = byId.get(entry.programId)
    if (!program) continue
    if (!latest.has(entry.n)) order.push(entry.n)
    latest.set(entry.n, program)
  }
  const list = order.map((n) => ({ n, program: latest.get(n)!, from: latest.get(n)!.startDate, until: null as string | null }))
  for (let i = 0; i < list.length - 1; i++) list[i].until = list[i + 1].from
  // A program replaced before its start date has no dates of its own.
  return list.filter((s) => s.until === null || s.until > s.from)
}

/** The program number in force on a date (rule 3): the last segment started on or before it, else the first. */
export function numberOnDate(segs: Segment[], iso: string): number | undefined {
  let found = segs[0]?.n
  for (const s of segs) if (s.from <= iso) found = s.n
  return found
}

/** A session's program number: from its stamp when that program is in the list, else the one in force on its date. */
export function numberOfSession(session: Pick<Session, 'date' | 'programId'>, history: ProgramEntry[], segs: Segment[]): number | undefined {
  const stamped = session.programId ? history.find((e) => e.programId === session.programId)?.n : undefined
  return stamped ?? numberOnDate(segs, session.date)
}

/** One week of one program, as Progress and Log show it. */
export interface WeekRef {
  n: number
  week: number
  program: Program
  dates: Date[]
  /** YYYY-MM-DD, exclusive: dates from here on belong to the next program. */
  until: string | null
  /** "Week 3", or "Program 2 · Week 3" once there is more than one program (rule 6). */
  label: string
  /** For corners of cards, where the full label does not fit at phone width: "Week 3", or "P2 · Week 3". */
  compact: string
  /** The week number alone, for the calendar's narrow column. */
  short: string
  /** Set on a program's first week when there is more than one program: "Program 2". */
  heading?: string
}

/**
 * Every week from the first program's week 1 to the active program's current
 * week, in order (rules 3 and 6). An earlier program ends with the last week
 * holding a date before the next program starts (its actual last week).
 */
export function weekRefs(segs: Segment[], today: Date): WeekRef[] {
  const many = segs.length > 1
  const refs: WeekRef[] = []
  segs.forEach((s, i) => {
    const last = i === segs.length - 1
    let weeks = currentWeek(s.program, today)
    if (!last && s.until) {
      weeks = 0
      for (let w = 1; w <= s.program.programWeeks; w++) if (toISODate(weekDates(s.program, w)[0]) < s.until) weeks = w
    }
    for (let w = 1; w <= weeks; w++) {
      refs.push({
        n: s.n,
        week: w,
        program: s.program,
        dates: weekDates(s.program, w),
        until: s.until,
        label: many ? `Program ${s.n} · Week ${w}` : `Week ${w}`,
        compact: many ? `P${s.n} · Week ${w}` : `Week ${w}`,
        short: String(w),
        ...(many && w === 1 ? { heading: `Program ${s.n}` } : {}),
      })
    }
  })
  return refs
}

/** Sessions that belong to program number `n`. */
export function sessionsOfNumber(sessions: Session[], n: number, history: ProgramEntry[], segs: Segment[]): Session[] {
  return sessions.filter((s) => numberOfSession(s, history, segs) === n)
}

/** Without a list yet (before the first activation), the active program alone is the timeline. */
export function historyOrActive(history: ProgramEntry[], active: Program | null): ProgramEntry[] {
  if (history.length > 0 || !active) return history
  return [{ programId: active.id, baseId: active.id, n: 1, activatedAt: `${active.startDate}T00:00:00.000Z` }]
}
