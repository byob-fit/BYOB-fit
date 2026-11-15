// D-101: the built-in exercise catalog (public/catalog/exercises.json). It is
// one more source for the pickers, after the starter programs and the stored
// programs. Each exercise is a plain program exercise; the machine names sit
// beside them, keyed by exercise id, so no program file ever carries one.

import type { Equipment, Exercise, ExerciseLevel, Muscle } from '../types/program.ts'

export interface Catalog {
  exercises: Record<string, Exercise>
  /** The machine or station an exercise is done on, by exercise id; also covers starter exercises. */
  machines: Record<string, string>
}

export const EMPTY_CATALOG: Catalog = { exercises: {}, machines: {} }

const MUSCLES: readonly Muscle[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'full_body', 'cardio']
const EQUIPMENT: readonly Equipment[] = ['none', 'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'band', 'bench', 'cardio_machine', 'other']
const LEVELS: readonly ExerciseLevel[] = ['beginner', 'intermediate', 'experienced']

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * The catalog as read from its file. An entry that is not a valid exercise is
 * left out, so one bad entry never empties the pickers; unknown keys are dropped.
 */
export function readCatalog(json: unknown): Catalog {
  if (!isRecord(json) || !isRecord(json.exercises)) return EMPTY_CATALOG
  const exercises: Record<string, Exercise> = {}
  for (const [id, raw] of Object.entries(json.exercises)) {
    if (!isRecord(raw) || typeof raw.name !== 'string' || raw.name.trim() === '' || typeof raw.howTo !== 'string') continue
    const exercise: Exercise = { name: raw.name, howTo: raw.howTo }
    if (Array.isArray(raw.muscles)) {
      const muscles = raw.muscles.filter((m): m is Muscle => MUSCLES.includes(m as Muscle))
      if (muscles.length) exercise.muscles = [...new Set(muscles)]
    }
    if (EQUIPMENT.includes(raw.equipment as Equipment)) exercise.equipment = raw.equipment as Equipment
    if (LEVELS.includes(raw.level as ExerciseLevel)) exercise.level = raw.level as ExerciseLevel
    exercises[id] = exercise
  }
  const machines: Record<string, string> = {}
  if (isRecord(json.machines)) {
    for (const [id, name] of Object.entries(json.machines)) if (typeof name === 'string' && name.trim() !== '') machines[id] = name
  }
  return { exercises, machines }
}
