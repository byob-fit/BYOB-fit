// D-095 in the database: the stamp runs once and only adds fields; activation
// never overwrites a stored program and numbers it in the list.
import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'

import { activateProgram, ensureProgramStamps, getProgramHistory, listPrograms, saveProgram, saveSession, setActiveProgram, listAllSessions } from '../src/db/index.ts'
import type { Program } from '../src/types/program.ts'
import type { Session } from '../src/types/stores.ts'

const program = (id: string, startDate: string): Program =>
  ({ id, name: id, startDate, programWeeks: 12, exercises: {}, days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d, i) => ({ id: d, order: i, name: d, rest: i === 0, sections: [] })) }) as unknown as Program
const session = (date: string, dayId: string): Session => ({ id: `${date}__${dayId}`, date, dayId, programWeek: 1, startedAt: `${date}T09:00:00.000Z`, endedAt: `${date}T10:00:00.000Z`, entries: [] })

describe('program list in the database (D-095)', () => {
  it('an existing user: the first load stamps every session and starts the list; nothing else changes', async () => {
    await saveProgram(program('mine', '2026-07-05'))
    await setActiveProgram('mine')
    await saveSession(session('2026-07-06', 'mon'))
    await saveSession(session('2026-09-21', 'mon'))
    await ensureProgramStamps()
    const sessions = await listAllSessions()
    expect(sessions.map((s) => s.programId)).toEqual(['mine', 'mine'])
    expect(sessions.map((s) => ({ ...s, programId: undefined }))).toEqual([session('2026-07-06', 'mon'), session('2026-09-21', 'mon')].map((s) => ({ ...s, programId: undefined })))
    expect((await getProgramHistory()).map((e) => [e.programId, e.n])).toEqual([['mine', 1]])
    await ensureProgramStamps()
    expect((await getProgramHistory()).length).toBe(1)
  })
  it('importing a file with the same id keeps the old program and numbers the new one 2', async () => {
    const stored = await activateProgram(program('mine', '2026-09-27'))
    expect(stored.id).toBe('mine-2')
    expect((await listPrograms()).map((p) => [p.id, p.startDate]).sort()).toEqual([['mine', '2026-07-05'], ['mine-2', '2026-09-27']])
    expect((await getProgramHistory()).map((e) => [e.programId, e.n])).toEqual([['mine', 1], ['mine-2', 2]])
    expect((await listAllSessions()).every((s) => s.programId === 'mine')).toBe(true)
  })
  it('the same id and start date again is an edited version: same number, new stored copy', async () => {
    const stored = await activateProgram(program('mine', '2026-09-27'))
    expect(stored.id).toBe('mine-3')
    expect((await getProgramHistory()).map((e) => [e.programId, e.n])).toEqual([['mine', 1], ['mine-2', 2], ['mine-3', 2]])
  })
})
