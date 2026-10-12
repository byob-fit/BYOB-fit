// D-097: the AI update's payload, blockers, prompt and reply.
import { afterEach, describe, expect, it, vi } from 'vitest'

import sample from '../../public/sample-program.json'
import { sendAndLog, type SendLogStore } from '../ai/send.ts'
import type { Program } from '../types/program.ts'
import type { BodyEntry, Goals, SentLogEntry, Session, Settings } from '../types/stores.ts'
import { buildPayload, type PayloadData } from './payload.ts'
import { REPROGRAM_SYSTEM_PROMPT, type Proposal } from './reprogram.ts'
import { currentBody, updateBlocker, updateLogged, updateProgram, updateSessions } from './updatePayload.ts'

const base = sample as unknown as Program
// Week 5 of the sample: Sep 6 is week 1, so week 4 starts Sep 27 and week 5 Oct 4.
const program: Program = structuredClone(base)
program.notes = 'Private program notes'
const bench = program.days.find((d) => d.id === 'mon')!.sections.flatMap((s) => s.items).find((i) => i.id === 's006')!
bench.cue = 'Shoulder blades back'
const retired = program.days.find((d) => d.id === 'mon')!.sections.flatMap((s) => s.items).find((i) => i.id === 's004')!
retired.retiredFrom = '2026-09-20'
program.exercises['bench-press'] = { ...program.exercises['bench-press'], howTo: 'HOWTO TEXT', muscles: ['chest'], equipment: 'barbell' } as Program['exercises'][string]

const goals: Goals = {
  items: [{ rank: 1, type: 'lose_weight', target: { amount: 10, unit: 'lb' } }],
  timeframeWeeks: 12,
  startDate: '2026-09-27',
  currentStats: { weight: 82, weightUnit: 'kg', bodyFatPct: 20, heightCm: 180, age: 40 },
  updatedAt: '2026-09-27T10:00:00Z',
}
const entries: BodyEntry[] = [
  { date: '2026-10-01', units: 'kg', weight: 83, bodyFatPct: 22.4, waist: 88, visceralFat: 8, updatedAt: '2026-10-01T07:00:00Z' },
  { date: '2026-10-05', units: 'kg', waist: 87, updatedAt: '2026-10-05T07:00:00Z' },
  { date: '2026-09-03', units: 'kg', weight: 84.1, updatedAt: '2026-09-03T07:00:00Z' },
]
function session(date: string, extra: Partial<Session> = {}): Session {
  return {
    id: `${date}__mon`,
    date,
    dayId: 'mon',
    programWeek: 4,
    endedAt: `${date}T10:00:00Z`,
    entries: [
      { itemId: 's006', exerciseId: 'bench-press', sets: [{ n: 1, weight: 60, reps: 8 }, { n: 2, raw: 'sore' }], note: 'Shoulder felt tight', feltOff: 'hard' },
      { itemId: 's007', exerciseId: 'incline-db-press', sets: [], skipped: true },
      { itemId: 's003', exerciseId: 'walk', sets: [{ n: 1, minutes: 5 }] },
    ],
    ...extra,
  }
}
const sessions: Session[] = [
  session('2026-09-20'), // week 3: outside the window
  session('2026-09-28', { programId: 'sample-3day' }), // week 4
  session('2026-10-05'), // week 5, no programId yet
  session('2026-10-06', { endedAt: undefined }), // unfinished
  session('2026-10-07', { programId: 'other-program' }), // another program
]
const settings: Settings = { apiKey: 'sk-ant-SECRET', rules: 'No training to failure.', units: 'lb', onboarding: { experience: 'new' } }
const data: PayloadData = {
  program,
  sessions: updateSessions(program, 5, sessions),
  goals,
  rules: settings.rules,
  settings,
  week: 5,
  startedDayIds: ['sun', 'mon'],
  bodyEntries: entries,
}

describe('current body (D-097 rule 2)', () => {
  it('takes the latest entry with a weight, and its own fat %', () => {
    expect(currentBody(entries, goals)).toEqual({ weight: 83, unit: 'kg', date: '2026-10-01', bodyFatPct: 22.4 })
  })
  it('falls back to the goal’s current stats, dated when the goal was saved', () => {
    expect(currentBody([], goals)).toEqual({ weight: 82, unit: 'kg', date: '2026-09-27', bodyFatPct: 20 })
  })
  it('leaves fat % out when the source has none', () => {
    expect(currentBody([{ date: '2026-10-02', units: 'lb', weight: 180, updatedAt: 'x' }], goals)).toEqual({ weight: 180, unit: 'lb', date: '2026-10-02' })
  })
  it('is null with no weight anywhere', () => {
    expect(currentBody([{ date: '2026-10-02', units: 'kg', waist: 80, updatedAt: 'x' }], { ...goals, currentStats: undefined })).toBeNull()
  })
})

describe('blockers (D-097 rules 1 and 2)', () => {
  it('needs a goal first, then a weight', () => {
    const body = currentBody(entries, goals)
    expect(updateBlocker(null, body)).toBe('goal')
    expect(updateBlocker(null, null)).toBe('goal')
    expect(updateBlocker(goals, null)).toBe('weight')
    expect(updateBlocker(goals, body)).toBeNull()
  })
})

describe('two weeks of history (D-097 rule 3)', () => {
  it('keeps finished sessions of this program from last week and this week', () => {
    expect(updateSessions(program, 5, sessions).map((s) => s.date)).toEqual(['2026-09-28', '2026-10-05'])
  })
  it('in week 1 there is no last week', () => {
    expect(updateSessions(program, 1, [session('2026-09-07'), session('2026-09-14')]).map((s) => s.date)).toEqual(['2026-09-07'])
  })
  it('sends only the numbers logged, per set', () => {
    const logged = updateLogged(program, updateSessions(program, 5, sessions))
    expect(logged[0]).toEqual({
      date: '2026-09-28',
      dayId: 'mon',
      entries: [
        { itemId: 's006', sets: [{ weight: 60, reps: 8 }] },
        { itemId: 's003', sets: [{ minutes: 5 }] },
      ],
    })
  })
  it('names the exercise only when it differs from the program’s', () => {
    const swapped = session('2026-10-05')
    swapped.entries[0] = { ...swapped.entries[0], exerciseId: 'incline-db-press' }
    expect(updateLogged(program, [swapped])[0].entries[0]).toEqual({ itemId: 's006', exerciseId: 'incline-db-press', sets: [{ weight: 60, reps: 8 }] })
  })
})

describe('the program, stripped (D-097 rule 4)', () => {
  const sent = updateProgram(program, 5, 'lb')
  const items = sent.days.flatMap((d) => d.sections ?? []).flatMap((s) => s.items)
  it('sends this week’s prescription, overrides resolved', () => {
    expect(items.find((i) => i.id === 's019')).toMatchObject({ exerciseId: 'back-squat', sets: 5, repMin: 5, repMax: 6, unit: 'kg' })
    expect(updateProgram(program, 4, 'lb').days.flatMap((d) => d.sections ?? []).flatMap((s) => s.items).find((i) => i.id === 's019')?.sets).toBe(4)
  })
  it('drops descriptive fields and retired items', () => {
    expect(items.find((i) => i.id === 's006')).toEqual({ id: 's006', exerciseId: 'bench-press', exercise: program.exercises['bench-press'].name, type: 'load_reps', sets: 4, repMin: 6, repMax: 8, restSec: 180, unit: 'kg' })
    expect(items.some((i) => i.id === 's004')).toBe(false)
    const text = JSON.stringify(sent)
    for (const word of ['HOWTO TEXT', 'Shoulder blades back', 'tempo', 'muscles', 'equipment', 'byWeek', 'index', 'Private program notes']) expect(text).not.toContain(word)
  })
  it('gives items without a unit the Settings unit', () => {
    const noUnit = structuredClone(program)
    delete noUnit.days.find((d) => d.id === 'mon')!.sections.flatMap((s) => s.items).find((i) => i.id === 's006')!.unit
    expect(updateProgram(noUnit, 5, 'lb').days.flatMap((d) => d.sections ?? []).flatMap((s) => s.items).find((i) => i.id === 's006')?.unit).toBe('lb')
  })
  it('lists every exercise by id and name only', () => {
    expect(sent.exercises['bench-press']).toBe(program.exercises['bench-press'].name)
    expect(Object.keys(sent.exercises)).toEqual(Object.keys(program.exercises))
  })
})

describe('one fixed payload (D-097 rule 5)', () => {
  it('is the same at every level and with or without notes', () => {
    const first = buildPayload('update', 'minimal', false, data).message
    for (const level of ['minimal', 'standard', 'full'] as const) for (const notes of [false, true]) expect(buildPayload('update', level, notes, data).message).toBe(first)
  })
  it('sends exactly the agreed keys and nothing else', () => {
    const sent = JSON.parse(buildPayload('update', 'full', true, data).message)
    expect(Object.keys(sent)).toEqual(['task', 'week', 'startedDayIds', 'goal', 'body', 'rules', 'program', 'logged'])
    expect(sent.goal).toEqual({ items: goals.items, timeframeWeeks: 12, startDate: '2026-09-27' })
    expect(sent.body).toEqual({ weight: 83, unit: 'kg', date: '2026-10-01', bodyFatPct: 22.4 })
    const text = JSON.stringify(sent)
    for (const word of ['bodyEntries', 'feltOff', 'experience', 'skipped', 'Shoulder felt tight', 'waist', 'visceralFat', 'heightCm', 'currentStats', 'sk-ant-SECRET', 'apiKey', 'raw']) expect(text).not.toContain(word)
  })
  it('sends rules only when written', () => {
    expect(JSON.parse(buildPayload('update', 'minimal', false, { ...data, rules: '  ' }).message)).not.toHaveProperty('rules')
  })
  it('summarises what is sent', () => {
    const { summary } = buildPayload('update', 'minimal', false, data)
    expect(summary.map((l) => l.label)).toEqual(['Program', 'Logged', 'Goal', 'Current weight', 'Body fat', 'Your training rules'])
    expect(summary.find((l) => l.label === 'Logged')?.value).toBe('4 sets from 2 sessions, last week and this week')
    expect(summary.find((l) => l.label === 'Current weight')?.value).toBe('83 kg on 2026-10-01')
    expect(summary.find((l) => l.label === 'Body fat')?.value).toBe('22.4%')
  })
})

describe('ask again (D-097 rule 7)', () => {
  it('adds the last proposal and the athlete’s words, and says so in the preview', () => {
    const previous: Proposal = { week: 5, overrides: [], add: [], remove: [], notes: 'Nothing yet.' }
    const { message, summary } = buildPayload('update', 'minimal', false, { ...data, followUp: { previous, instruction: 'Keep squats at 4 sets.' } })
    expect(JSON.parse(message).followUp).toEqual({ previous, instruction: 'Keep squats at 4 sets.' })
    expect(summary.at(-1)).toEqual({ label: 'Your request', value: '“Keep squats at 4 sets.”' })
  })
})

describe('the update prompt (D-097)', () => {
  it('carries the approved decision rules', () => {
    for (const line of [
      'Weight is not a program field.',
      'An item logged once or not at all stays as it is.',
      'No change is a valid and often correct answer.',
      '"notes" is shown to the athlete first and is never empty',
      '"followUp" (only on a follow-up)',
      '"rules" (only when the athlete has written some)',
    ])
      expect(REPROGRAM_SYSTEM_PROMPT).toContain(line)
    expect(REPROGRAM_SYSTEM_PROMPT).not.toContain('—')
  })
})

describe('the reply is kept (D-097 rule 8)', () => {
  afterEach(() => vi.unstubAllGlobals())
  function store() {
    const saved = new Map<string, SentLogEntry>()
    const s: SendLogStore = {
      append: async (entry) => void saved.set(entry.id, entry),
      setStatus: async (id, status, error, usage, reply) => void saved.set(id, { ...saved.get(id)!, status, ...(error ? { error } : {}), ...usage, ...(reply !== undefined ? { reply } : {}) }),
    }
    return { s, saved }
  }
  const input = { kind: 'update' as const, level: 'minimal' as const, payload: { message: '{}', summary: [] }, system: 'sys', settings: { apiKey: 'sk-ant-test', model: 'claude-sonnet-5' }, maxTokens: 10, timeoutMs: 5000 }
  it('saves the text of a successful reply', async () => {
    const { s, saved } = store()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: '{"week":5}' }], usage: { input_tokens: 3, output_tokens: 2 } }), { status: 200 })))
    await sendAndLog(input, s)
    expect([...saved.values()][0].reply).toBe('{"week":5}')
  })
  it('saves nothing for a failed call', async () => {
    const { s, saved } = store()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    await sendAndLog(input, s)
    expect([...saved.values()][0].reply).toBeUndefined()
  })
})
