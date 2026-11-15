// D-101: the built-in catalog file and how it joins the picker library.

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { exerciseLibrary, filterLibrary } from './builder.ts'
import { EMPTY_CATALOG, readCatalog } from './catalog.ts'
import type { Program } from '../types/program.ts'

const file = JSON.parse(readFileSync('public/catalog/exercises.json', 'utf8')) as { exercises: Record<string, Record<string, unknown>>; machines: Record<string, string> }
const starters = ['starter-3day-fullbody', 'starter-4day-upper-lower', 'starter-5day-split'].map(
  (name) => JSON.parse(readFileSync(`public/templates/${name}.json`, 'utf8')) as Program,
)
const starterExercises = Object.assign({}, ...starters.map((p) => p.exercises)) as Program['exercises']

describe('D-101 the catalog file', () => {
  const catalog = readCatalog(file)

  it('holds 103 exercises and every one reads as a valid exercise with muscles, equipment and level', () => {
    expect(Object.keys(file.exercises)).toHaveLength(103)
    expect(Object.keys(catalog.exercises)).toHaveLength(103)
    for (const [id, exercise] of Object.entries(catalog.exercises)) {
      expect(exercise.howTo.length, id).toBeGreaterThan(20)
      expect(exercise.muscles?.length, id).toBeGreaterThan(0)
      expect(exercise.equipment, id).toBeDefined()
      expect(exercise.level, id).toBeDefined()
      expect(Object.keys(file.exercises[id]).sort(), id).toEqual(['equipment', 'howTo', 'level', 'muscles', 'name'])
    }
  })

  it('repeats no id or name of a starter exercise, and no name of its own', () => {
    const names = [...Object.values(catalog.exercises), ...Object.values(starterExercises)].map((e) => e.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    for (const id of Object.keys(catalog.exercises)) expect(starterExercises[id], id).toBeUndefined()
  })

  it('keeps the text standard: curly apostrophes, no em dash, American spelling (D-092)', () => {
    const text = [...Object.values(catalog.exercises).flatMap((e) => [e.name, e.howTo]), ...Object.values(catalog.machines)].join(' ')
    expect(text).not.toMatch(/['—]/)
    expect(text).not.toMatch(/\btowards\b|\bcentre\b|\bprogramme\b/)
  })

  it('names a machine only for an exercise that exists, and for every machine and cardio machine exercise of its own', () => {
    for (const id of Object.keys(catalog.machines)) expect(catalog.exercises[id] ?? starterExercises[id], id).toBeDefined()
    for (const [id, exercise] of Object.entries(catalog.exercises)) {
      if (exercise.equipment === 'machine' || exercise.equipment === 'cardio_machine') expect(catalog.machines[id], id).toBeDefined()
    }
  })

  it('covers the machines the Nov 14 coverage check found missing', () => {
    for (const id of ['lying-leg-curl', 'machine-row', 'cable-chest-press', 'cable-shoulder-press', 'cable-lift', 'cable-step-up', 'machine-squat', 'machine-triceps-extension', 'machine-hip-thrust', 'machine-hip-extension']) {
      expect(catalog.exercises[id], id).toBeDefined()
    }
  })
})

describe('D-101 reading a catalog', () => {
  it('leaves out an entry that is not an exercise and drops unknown values', () => {
    const read = readCatalog({
      exercises: {
        good: { name: 'Good', howTo: 'Do it.', muscles: ['legs', 'wings', 'legs'], equipment: 'spaceship', level: 'beginner', machine: 'x' },
        nameless: { howTo: 'No name.' },
        text: 'not an object',
      },
      machines: { good: 'Good machine', empty: ' ', number: 4 },
    })
    expect(read.exercises).toEqual({ good: { name: 'Good', howTo: 'Do it.', muscles: ['legs'], level: 'beginner' } })
    expect(read.machines).toEqual({ good: 'Good machine' })
  })

  it('reads anything else as an empty catalog', () => {
    expect(readCatalog(null)).toEqual(EMPTY_CATALOG)
    expect(readCatalog({ exercises: [] })).toEqual(EMPTY_CATALOG)
  })
})

describe('D-101 the catalog in the picker library', () => {
  const catalog = readCatalog(file)
  const library = exerciseLibrary(starters, [], catalog)

  it('comes after the starters: 37 starter exercises, then 103 more', () => {
    expect(library).toHaveLength(140)
    expect(library[0].id).toBe(Object.keys(starters[0].exercises)[0])
  })

  it('never replaces an exercise a program already has under the same id', () => {
    const own = { ...starters[0], exercises: { 'lying-leg-curl': { name: 'My curl', howTo: '' } } } as Program
    const entry = exerciseLibrary([], [own], catalog).find((e) => e.id === 'lying-leg-curl')
    expect(entry?.exercise.name).toBe('My curl')
    expect(entry?.machine).toBe('Lying leg curl machine')
  })

  it('carries the machine beside the exercise, never inside it, and gives starters theirs', () => {
    const press = library.find((e) => e.id === 'leg-press')
    expect(press?.machine).toBe('Leg press')
    for (const entry of library) expect('machine' in entry.exercise, entry.id).toBe(false)
  })

  it('is found by machine name', () => {
    const found = filterLibrary(library, { query: 'smith machine' }).map((e) => e.id)
    expect(found).toHaveLength(9)
    expect(filterLibrary(library, { query: 'hip thrust machine' }).map((e) => e.id).sort()).toEqual(['hip-thrust-machine', 'machine-hip-thrust', 'single-leg-hip-thrust', 'smith-hip-thrust'])
  })

  it('without a catalog the library is what it was', () => {
    expect(exerciseLibrary(starters, [])).toHaveLength(37)
  })
})
