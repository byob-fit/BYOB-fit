// D-098: update history by date across programs, matched by exercise; units in review and week note payloads.
import { describe, expect, it } from 'vitest'

import sample from '../../public/sample-program.json'
import type { Program } from '../types/program.ts'
import type { Session, Settings } from '../types/stores.ts'
import { buildPayload } from './payload.ts'
import { REPROGRAM_SYSTEM_PROMPT } from './reprogram.ts'
import { updateLogged, updateSessions } from './updatePayload.ts'

const program = structuredClone(sample as unknown as Program)

function done(date: string, entries: Session['entries'], programId?: string): Session {
  return { id: `${date}__x`, date, dayId: 'mon', programWeek: 1, endedAt: `${date}T10:00:00Z`, entries, ...(programId ? { programId } : {}) }
}
const benchOld = { itemId: 'old-01', exerciseId: 'bench-press', sets: [{ n: 1, weight: 55, reps: 8 }] }
const notInProgram = { itemId: 'old-02', exerciseId: 'zercher-squat', sets: [{ n: 1, weight: 80, reps: 5 }] }

describe('the last 14 days, any program (D-098 rule 1)', () => {
  it('includes today and the 13 days before it, and nothing earlier or later', () => {
    const s = ['2026-09-28', '2026-09-29', '2026-10-12', '2026-10-13'].map((d) => done(d, [benchOld]))
    expect(updateSessions(s, '2026-10-12').map((x) => x.date)).toEqual(['2026-09-29', '2026-10-12'])
  })
  it('counts an earlier program’s sessions in a new program’s first week (the owner’s Oct 11 case)', () => {
    const s = [done('2026-10-01', [benchOld], 'old-program'), done('2026-10-05', [benchOld], 'old-program'), done('2026-10-11', [{ itemId: 's006', exerciseId: 'bench-press', sets: [{ n: 1, weight: 60, reps: 8 }] }], program.id)]
    expect(updateSessions(s, '2026-10-12')).toHaveLength(3)
  })
})

describe('matched by exercise (D-098 rule 2)', () => {
  const logged = updateLogged(program, 1, [done('2026-10-05', [benchOld, notInProgram], 'old-program')])
  it('names the exercise and leaves out an item id the program does not have', () => {
    expect(logged[0].entries).toEqual([{ exerciseId: 'bench-press', sets: [{ weight: 55, reps: 8 }] }])
  })
  it('leaves out exercises the program does not use', () => {
    expect(JSON.stringify(logged)).not.toContain('zercher-squat')
  })
  it('sends no day id', () => {
    expect(logged[0]).not.toHaveProperty('dayId')
  })
})

describe('the prompt (D-098 rule 3)', () => {
  it('tells the model how to match history', () => {
    expect(REPROGRAM_SYSTEM_PROMPT).toContain('Match logged sessions to program items by exercise id; sessions from an earlier program count as evidence for the same exercise.')
    expect(REPROGRAM_SYSTEM_PROMPT).toContain('sessions from the last 14 days')
  })
})

describe('units in the review and week note payloads (D-098 rule 4)', () => {
  const noUnit = structuredClone(program)
  const items = noUnit.days.flatMap((d) => d.sections).flatMap((s) => s.items)
  delete items.find((i) => i.id === 's006')!.unit
  const settings: Settings = { units: 'lb' }
  for (const kind of ['review', 'week_note'] as const) {
    it(`${kind}: an item with sets and no unit carries the Settings unit; others are unchanged`, () => {
      const sent = JSON.parse(buildPayload(kind, 'minimal', false, { program: noUnit, sessions: [], goals: null, settings }).message).program as Program
      const all = sent.days.flatMap((d) => d.sections).flatMap((s) => s.items)
      expect(all.find((i) => i.id === 's006')?.unit).toBe('lb')
      expect(all.find((i) => i.id === 's019')?.unit).toBe('kg')
      expect(all.find((i) => i.id === 's003')).not.toHaveProperty('unit')
    })
  }
  it('does not change the stored program', () => {
    buildPayload('review', 'minimal', false, { program: noUnit, sessions: [], goals: null, settings })
    expect(items.find((i) => i.id === 's006')).not.toHaveProperty('unit')
  })
})
