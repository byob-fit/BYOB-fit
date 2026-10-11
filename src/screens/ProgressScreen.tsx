// Progress (D-077 rule 1, D-080; frames 2.18, 3.09, 3.10, 3.12, 3.14, 4.02):
// Training, Nutrition and Body, each with its week score, trend, parts in
// words, "How this is worked out", missing data named and inline SVG charts.
// Training also holds the exercise list, history and set editing that were
// the Log tab, unchanged in behaviour.

import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { useWeekReview } from '../ai/useWeekReview.tsx'
import { Sheet } from '../builder/ui.tsx'
import { getGoals, getProgramHistory, listAllSessions, listBodyEntries, listMealDays, listPrograms } from '../db/index.ts'
import { BODY_FIELDS, formatValue, unitLabel, valueIn, type BodyField } from '../lib/body.ts'
import { NOT_TAGGED, bodySeries, indexExerciseIds, oneRepMaxSeries, sevenDayAverage, setsPerMuscle } from '../lib/charts.ts'
import { toISODate } from '../lib/dates.ts'
import { aiEstimated } from '../lib/mealLocal.ts'
import { SODIUM_LIMIT_MG, energyBand, fibreTarget } from '../lib/nutrients.ts'
import { dayForDate } from '../lib/program.ts'
import { historyOrActive, segments, sessionsOfNumber, weekRefs, type ProgramEntry, type Segment, type WeekRef } from '../lib/programHistory.ts'
import {
  bodyComparison,
  bodyMeasures,
  bodyScore,
  combine,
  countedDates,
  nutritionStart,
  trainingStart,
  isFinishedSession,
  mainGoal,
  nutritionCounts,
  nutritionDays,
  nutritionParts,
  trainingCounts,
  trainingParts,
  trendSentence,
  type BodyComparison,
  type NutritionCounts,
  type TrainingCounts,
} from '../lib/scores.ts'
import { computeTargets } from '../lib/targets.ts'
import { bodyWeekData, nutritionWeekData, programFor, trainingWeekData, weekSessions } from '../lib/weekNotes.ts'
import { useProgram } from '../program/useProgram.ts'
import { unitsOf } from '../settings/defaults.ts'
import { useSettings } from '../settings/useSettings.ts'
import type { Program } from '../types/program.ts'
import type { BodyEntry, DayChange, Goals, MealDay, Session } from '../types/stores.ts'
import { ChartCard, DayLabels, DotRow, LineChart, Sparkline, WeekBars } from '../ui/charts.tsx'
import { AppHeader, EmptyState, ProgressRing, Segmented } from '../ui/shell.tsx'
import { LogScreen } from './LogScreen.tsx'

export type ProgressView = 'training' | 'nutrition' | 'body'

const VIEWS: { value: ProgressView; label: string }[] = [
  { value: 'training', label: 'Training' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'body', label: 'Body' },
]

const DAY_LETTER = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' })

export function ProgressHeader({ view, context }: { view: ProgressView; context?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <AppHeader context={context}>
      <Segmented label="Progress" value={view} options={VIEWS} onChange={(next) => navigate(`/progress/${next}`)} />
    </AppHeader>
  )
}

interface Data {
  sessions: Session[]
  meals: MealDay[]
  body: BodyEntry[]
  goals: Goals | null
  programs: Program[]
  history: ProgramEntry[]
}

/** D-095: every week across programs (rules 3 and 6), and the one under review. */
interface Timeline {
  history: ProgramEntry[]
  segs: Segment[]
  refs: WeekRef[]
  /** The week reviewed: the last finished week, or week 1 while it is the only one. */
  review: WeekRef
  reviewIndex: number
  first: boolean
}

function timelineOf(program: Program, data: Data, today: Date): Timeline {
  const programs = [...data.programs.filter((p) => p.id !== program.id), program]
  let history = historyOrActive(data.history, program)
  if (history[history.length - 1]?.programId !== program.id) history = historyOrActive([], program)
  const segs = segments(history, programs)
  const refs = weekRefs(segs, today)
  const first = refs.length <= 1
  const reviewIndex = first ? 0 : refs.length - 2
  return { history, segs, refs, review: refs[reviewIndex], reviewIndex, first }
}

function useData(): Data | null {
  const [data, setData] = useState<Data | null>(null)
  useEffect(() => {
    let live = true
    void Promise.all([listAllSessions(), listMealDays(), listBodyEntries(), getGoals(), listPrograms(), getProgramHistory()]).then(([sessions, meals, body, goals, programs, history]) => {
      if (live) setData({ sessions, meals, body, goals: goals ?? null, programs, history })
    })
    return () => {
      live = false
    }
  }, [])
  return data
}

/** The score card: the ring, the week, a sentence and the trend (3.09). */
function ScoreCard({ score, label, view, sentence, trend }: { score: number | null; label: string; view: ProgressView; sentence: string; trend?: (number | null)[] }) {
  return (
    <section className="card-v3 score-card">
      {score !== null ? (
        <ProgressRing value={score / 100} label={`Score ${score} of 100`}>
          <span className="score-card__number">{score}</span>
          <span className="score-card__of">of 100</span>
        </ProgressRing>
      ) : null}
      <div className="score-card__text">
        <span className="score-card__week">
          {label} · {view}
        </span>
        <span className="score-card__sentence">{sentence}</span>
        {trend && <Sparkline values={trend} />}
      </div>
    </section>
  )
}

function PartBar({ text, value }: { text: string; value: number | null }) {
  return (
    <div className="part">
      <span className="part__text">{text}</span>
      {value !== null && (
        <div className="bar-v3" aria-hidden="true">
          <span className="bar-v3__fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
        </div>
      )}
    </div>
  )
}

function Missing({ text, onAdd }: { text: string; onAdd?: () => void }) {
  return (
    <div className="missing">
      <span>{text}</span>
      {onAdd && (
        <button type="button" className="missing__add" onClick={onAdd}>
          Add
        </button>
      )}
    </div>
  )
}

function HowItWorks({ title, rows, onClose }: { title: string; rows: { weight?: string; head: string; text: string }[]; onClose: () => void }) {
  return (
    <Sheet title={title} body="" onClose={onClose}>
      <div className="how">
        {rows.map((row) => (
          <div className="how__row" key={row.head}>
            {row.weight && <span className="how__weight">{row.weight}</span>}
            <p className="how__text">
              <b>{row.head}</b> {row.text}
            </p>
          </div>
        ))}
        <p className="how__note">
          The weights are judgment calls, not science. A part with no data drops out and the others fill its share. Worked out on your phone, never by the AI. Training,
          nutrition and body are never combined.
        </p>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </Sheet>
  )
}

const TRAINING_HOW = [
  { weight: '40%', head: 'Workouts done.', text: 'Workouts you finished, out of those planned. A workout counts once it has at least one logged set.' },
  { weight: '30%', head: 'Sets done.', text: "Working sets you logged, out of those planned. Extra sets don’t push it past 100%. Exercises you skip and sets you remove count as not done; anything skipped through Felt off isn’t held against you." },
  {
    weight: '30%',
    head: 'Progress.',
    text: "Each exercise’s top set against the last comparable one. Up counts fully, down counts nothing. Same counts half when your main goal is muscle or strength, and fully when it’s fat loss or maintenance.",
  },
]

const NUTRITION_HOW = [
  { weight: '25%', head: 'Days logged.', text: 'Days with meals logged, out of the days in the week.' },
  { weight: '35%', head: 'Calorie range.', text: 'Logged days within 10% of your calorie target. A day below the safety floor never counts as in range.' },
  { weight: '25%', head: 'Protein.', text: 'Logged days at or above your protein target.' },
  { weight: '15%', head: 'Fiber.', text: 'Logged days at or above your fiber target: 14 g for every 1,000 kcal of your calorie target. AI estimates count, and are marked.' },
]

const BODY_HOW = [
  { head: 'What is scored.', text: 'Only the measures your main goal is about: fat mass and muscle for losing fat while building muscle; fat mass and body fat for losing fat; muscle for building muscle. Everything else is a trend.' },
  { head: 'Against what.', text: 'Your latest entry against the one about four weeks earlier (21 to 35 days).' },
  {
    head: 'Normal change.',
    text: 'A change in your goal’s direction beyond normal day-to-day change counts fully; within it, half; beyond it the other way, nothing. Normal change: 1 point of body fat, 0.7 kg (1.5 lb) of fat mass, 0.9 kg (2.0 lb) of muscle, the last a stand-in until a muscle figure is found.',
  },
]

/** Frame 4.02: the first week, before any full week has ended. */
function FirstWeek({ view, children }: { view: ProgressView; children?: ReactNode }) {
  return (
    <section className="card-v3 score-card score-card--empty">
      <div className="score-card__text">
        <span className="score-card__week">Week 1 · {view}</span>
        <span className="score-card__sentence">Your first score arrives on Sunday, after your first full week.</span>
        {children}
      </div>
    </section>
  )
}

function trainingWords(c: TrainingCounts) {
  return {
    adherence: c.planned ? `${c.finished} of ${c.planned} workouts done` : 'No workouts planned',
    completeness: c.prescribed ? `${c.confirmed} of ${c.prescribed} sets` : 'No sets planned in finished workouts',
    progression: `${c.up} up, ${c.same} same, ${c.down} down${c.newCount ? `, ${c.newCount} new` : ''}`,
  }
}

function TrainingView({ program, t, data, today, changes, units }: { program: Program; t: Timeline; data: Data; today: Date; changes: DayChange[]; units: string }) {
  const navigate = useNavigate()
  const [how, setHow] = useState(false)
  const goal = mainGoal(data.goals)
  // D-089: dates before the first finished workout are Not started and not counted.
  const start = trainingStart(data.sessions)
  // D-095 rule 3: each week is read against its own program and only that program's sessions.
  const counts = (r: WeekRef) => trainingCounts({ program: r.program, changes, sessions: sessionsOfNumber(data.sessions, r.n, t.history, t.segs), week: r.week, today, start, until: r.until })
  const { first, review } = t
  const c = counts(review)
  const parts = trainingParts(c, goal)
  const score = first ? null : combine(parts)
  const w = trainingWords(c)
  const dates = review.dates.map(toISODate)
  // D-081: the week's score, its parts and the underlying data, at the user's level.
  const ai = useWeekReview({
    enabled: !first,
    review: {
      view: 'training',
      weekStart: dates[0],
      programWeek: review.week,
      score,
      parts: [
        { label: 'Workouts done', value: w.adherence, weight: 40 },
        { label: 'Sets done', value: w.completeness, weight: 30 },
        { label: 'Progress', value: w.progression, weight: 30 },
      ],
      data: trainingWeekData(c),
      summary: [
        { label: 'Training', value: `${w.adherence}, ${w.completeness}, ${w.progression}` },
        { label: 'Lifts', value: 'Sets logged this week, with dates' },
      ],
    },
    data: { program: programFor('training', review.program), sessions: weekSessions(data.sessions, dates), goals: data.goals, bodyEntries: data.body },
  })
  if (ai.picking) return <>{ai.element}</>

  if (first) {
    return (
      <>
        <FirstWeek view="training">
          <span className="part__label">So far this week</span>
          <PartBar text={w.adherence} value={c.planned ? c.finished / c.planned : null} />
          <PartBar text={w.completeness} value={c.prescribed ? c.confirmed / c.prescribed : null} />
        </FirstWeek>
        <p className="note-v3">Progress needs last week to compare with. It starts in week 2.</p>
        <TrainingCharts program={program} t={t} data={data} today={today} changes={changes} units={units} />
        <LogScreen embedded />
      </>
    )
  }

  const trend = t.refs.slice(0, t.reviewIndex + 1).map((r) => combine(trainingParts(counts(r), goal)))
  return (
    <>
      {ai.element}
      <ScoreCard score={score} label={review.label} view="training" sentence={trendSentence(score, t.reviewIndex > 0 ? trend[t.reviewIndex - 1] : null)} trend={trend} />
      {ai.notes}
      <section className="card-v3 parts">
        <PartBar text={w.adherence} value={parts[0].value} />
        <PartBar text={w.completeness} value={parts[1].value} />
        <span className="part__text">{c.up + c.same + c.down > 0 ? w.progression : c.newCount ? `${c.newCount} new, nothing to compare with yet` : 'Nothing to compare with yet'}</span>
        {goal === null && <Missing text="No goal yet: Same counts fully until you set one" onAdd={() => navigate('/goal')} />}
        <button type="button" className="btn btn--tertiary how-link" onClick={() => setHow(true)}>
          How this is worked out
        </button>
      </section>
      {ai.button}
      <TrainingCharts program={program} t={t} data={data} today={today} changes={changes} units={units} />
      <LogScreen embedded />
      {how && <HowItWorks title="How the training score works" rows={TRAINING_HOW} onClose={() => setHow(false)} />}
    </>
  )
}

function TrainingCharts({ program, t, data, today, changes, units }: { program: Program; t: Timeline; data: Data; today: Date; changes: DayChange[]; units: string }) {
  const review = t.review
  const current = t.refs[t.refs.length - 1].week
  // D-095 rule 4: lift lines run across programs; an exercise no longer in the program keeps its name.
  const nameOf = (id: string) => program.exercises[id]?.name ?? data.programs.find((p) => p.exercises[id])?.exercises[id]?.name ?? id
  // Estimated one-rep max per lift: the index lifts, or the three most logged load lifts.
  const index = [...indexExerciseIds(program, current)]
  const logged = new Map<string, number>()
  for (const s of data.sessions) for (const e of s.entries) if (e.sets.some((x) => x.weight !== undefined)) logged.set(e.exerciseId, (logged.get(e.exerciseId) ?? 0) + 1)
  const lifts = (index.length ? index : [...logged.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)).slice(0, 4)
  const series = lifts.map((id) => ({ id, name: nameOf(id), points: oneRepMaxSeries(data.sessions, id) })).filter((s) => s.points.length > 0)
  const unit = program.days.flatMap((d) => d.sections.flatMap((s) => s.items)).find((i) => i.unit)?.unit ?? units

  const weekIso = review.dates.map(toISODate)
  const weekSessions = sessionsOfNumber(data.sessions, review.n, t.history, t.segs).filter((s) => weekIso.includes(s.date) && isFinishedSession(s))
  const muscles = setsPerMuscle(weekSessions, review.program)
  const most = Math.max(1, ...muscles.map((m) => m.sets))
  const todayIso = toISODate(today)
  const start = trainingStart(data.sessions)
  return (
    <>
      <ChartCard title="Estimated one-rep max" aside={series.length ? `${unit}, best set each session` : undefined}>
        {series.length === 0 ? (
          <p className="chart-empty">Log a few sessions with weight and reps to see this.</p>
        ) : (
          series.map((s) => (
            <div className="lift" key={s.id}>
              <div className="lift__head">
                <span>{s.name}</span>
                <b>
                  {formatValue(s.points[s.points.length - 1].value, 'mass')} {unit}
                </b>
              </div>
              <LineChart series={[{ points: s.points, tone: 'sage' }]} height={56} label={`${s.name} estimated one-rep max`} />
            </div>
          ))
        )}
      </ChartCard>
      <ChartCard title="Working sets by muscle group" aside={review.compact}>
        {muscles.length === 0 ? (
          <p className="chart-empty">No finished workouts this week.</p>
        ) : (
          <div className="hbars">
            {muscles.map((m) => (
              <div className="hbar" key={m.muscle}>
                <span className="hbar__label">{m.muscle === NOT_TAGGED ? 'Not tagged' : m.muscle.replace(/_/g, ' ')}</span>
                <span className="hbar__track">
                  <span className={m.muscle === NOT_TAGGED ? 'hbar__fill hbar__fill--soft' : 'hbar__fill'} style={{ width: `${(m.sets / most) * 100}%` }} />
                </span>
                <span className="hbar__value">{m.sets}</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
      <ChartCard
        title="Workouts done"
        aside="by week"
        legend={[
          { label: 'Done', tone: 'sage' },
          { label: 'Missed', tone: 'soft' },
          { label: 'Rest', tone: 'line' },
          { label: 'Not started', tone: 'line', dashed: true },
        ]}
      >
        <div className="calendar" role="img" aria-label="Workouts done by week">
          {t.refs.map((r) => (
            <Fragment key={`${r.n}-${r.week}`}>
            {r.heading && <div className="calendar__program">{r.heading}</div>}
            <div className="calendar__row">
              <span className="calendar__week">{r.short}</span>
              {r.dates.map((date) => {
                const iso = toISODate(date)
                const day = dayForDate(r.program, changes, date)
                // D-095 rule 3: a date in the next program's time shows as a rest cell in this row.
                const ours = !r.until || iso < r.until
                const done = isFinishedSession(sessionsOfNumber(data.sessions, r.n, t.history, t.segs).find((s) => s.date === iso && s.dayId === day.id))
                // Today is still to come until it is done.
                const state = day.rest ? 'rest' : done ? 'done' : iso >= todayIso ? 'future' : start === null || iso < start ? 'notstarted' : 'missed'
                return <span key={iso} className={`calendar__cell calendar__cell--${ours ? state : 'rest'}`} />
              })}
            </div>
            </Fragment>
          ))}
          <DayLabels labels={t.refs[t.refs.length - 1].dates.map((d) => DAY_LETTER.format(d))} />
        </div>
      </ChartCard>
    </>
  )
}

function nutritionSentence(c: NutritionCounts, parts: ReturnType<typeof nutritionParts>): string {
  if (!c.hasEnergyTarget && !c.hasFibreTarget) return c.hasProteinTarget ? 'Scored on logging and protein only for now.' : 'Scored on logging only for now.'
  if (c.logged === 0) return 'Nothing logged this week.'
  const logging = c.logged === c.days ? 'Logged every day.' : c.logged >= c.days - 1 ? 'Logged almost every day.' : `Logged ${c.logged} of ${c.days} days.`
  const names: Record<string, string> = { energy: 'The calorie range', protein: 'Protein', fibre: 'Fiber' }
  const weakest = parts.filter((p) => p.key !== 'logging' && p.value !== null).sort((a, b) => (a.value as number) - (b.value as number))[0]
  return weakest && (weakest.value as number) < 0.5 ? `${logging} ${names[weakest.key]} is the gap.` : logging
}

function NutritionView({ program, t, data, today }: { program: Program | null; t: Timeline | null; data: Data; today: Date }) {
  const navigate = useNavigate()
  const [how, setHow] = useState(false)
  const targets = computeTargets(data.goals, data.body, toISODate(today))
  const fibre = fibreTarget(targets.kcal, data.goals?.currentStats)
  // D-089: days before the first logged meal day are Not started and not counted.
  const mealStart = nutritionStart(data.meals)
  // D-095 rule 3: a week's days end where the next program starts.
  const datesOf = (r: WeekRef | null) => {
    if (r) return countedDates(r.dates, today, mealStart).filter((d) => !r.until || toISODate(d) < r.until).map(toISODate)
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - 7)
    return Array.from({ length: 7 }, (_, i) => toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)))
  }
  const first = Boolean(t?.first)
  const ref = t?.review ?? null
  const label = ref?.label ?? 'Week 1'
  const dates = datesOf(ref)
  const days = nutritionDays(dates, data.meals, targets, fibre)
  const c = nutritionCounts(days, targets, fibre)
  const parts = nutritionParts(c)
  const score = first ? null : combine(parts)
  const trend = t && !first ? t.refs.slice(0, t.reviewIndex + 1).map((r) => combine(nutritionParts(nutritionCounts(nutritionDays(datesOf(r), data.meals, targets, fibre), targets, fibre)))) : undefined
  const weekItems = data.meals.filter((m) => dates.includes(m.date)).flatMap((m) => m.parsed?.items ?? [])
  const hasAi = aiEstimated(weekItems, 'fibreG') || aiEstimated(weekItems, 'kcal')
  const band = targets.kcal !== undefined ? energyBand(targets.kcal, targets.floor ?? 0) : undefined
  const fullDates = ref ? ref.dates : dates.map((d) => new Date(`${d}T12:00:00`))
  const allDays = nutritionDays(fullDates.map(toISODate), data.meals, targets, fibre)
  const letters = fullDates.map((d) => DAY_LETTER.format(d))
  const kcalMax = Math.max(targets.kcal ? targets.kcal * 1.25 : 0, ...allDays.map((d) => d.kcal ?? 0), 1)
  const sodiumMax = Math.max(SODIUM_LIMIT_MG * 1.25, ...allDays.map((d) => d.sodiumMg ?? 0))

  const partRows = (
    <>
      <PartBar text={`${c.logged} of ${c.days} days logged`} value={parts[0].value} />
      {c.hasEnergyTarget ? (
        <PartBar text={`${c.inBand} ${c.inBand === 1 ? 'day' : 'days'} in your calorie range`} value={parts[1].value} />
      ) : (
        <Missing text="No calorie target yet: add height, age and sex in Goals" onAdd={() => navigate('/goal')} />
      )}
      {c.hasProteinTarget ? (
        <PartBar text={`${c.atProtein} ${c.atProtein === 1 ? 'day' : 'days'} at protein`} value={parts[2].value} />
      ) : (
        <Missing text="No protein target yet: add your weight in Goals" onAdd={() => navigate('/goal')} />
      )}
      {c.hasFibreTarget ? (
        <PartBar text={`${c.atFibre} ${c.atFibre === 1 ? 'day' : 'days'} at fiber`} value={parts[3].value} />
      ) : (
        <Missing text="No fiber target yet: it comes from your calorie target" onAdd={() => navigate('/goal')} />
      )}
    </>
  )
  const missingAny = !c.hasEnergyTarget || !c.hasProteinTarget || !c.hasFibreTarget
  const ai = useWeekReview({
    enabled: !first && Boolean(program),
    review: {
      view: 'nutrition',
      weekStart: fullDates.map(toISODate)[0],
      ...(ref ? { programWeek: ref.week } : {}),
      score,
      parts: [
        { label: 'Days logged', value: `${c.logged} of ${c.days} days logged`, weight: 25 },
        { label: 'Calorie range', value: c.hasEnergyTarget ? `${c.inBand} days in range` : 'No calorie target', weight: 35 },
        { label: 'Protein', value: c.hasProteinTarget ? `${c.atProtein} days at protein` : 'No protein target', weight: 25 },
        { label: 'Fiber', value: c.hasFibreTarget ? `${c.atFibre} days at fiber` : 'No fiber target', weight: 15 },
      ],
      data: nutritionWeekData(days, data.meals, targets, fibre),
      summary: [{ label: 'Nutrition', value: 'Daily calories, protein, fiber and the other nutrients against targets; no food lines' }],
    },
    data: { program: null, sessions: [], goals: data.goals, bodyEntries: data.body },
  })
  if (ai.picking) return <>{ai.element}</>

  return (
    <>
      {ai.element}
      {first ? (
        <FirstWeek view="nutrition">
          <span className="part__label">So far this week</span>
          {partRows}
        </FirstWeek>
      ) : (
        <>
          <ScoreCard score={score} label={label} view="nutrition" sentence={nutritionSentence(c, parts)} trend={trend} />
          {ai.notes}
          <section className="card-v3 parts">
            {partRows}
            {hasAi && (
              <p className="parts__note">
                Includes values marked <span className="ai-tag">AI estimate</span>
              </p>
            )}
            {missingAny && <p className="parts__note">{missingNote(c)}</p>}
            <button type="button" className="btn btn--tertiary how-link" onClick={() => setHow(true)}>
              How this is worked out
            </button>
          </section>
          {missingAny && (
            <div className="actions-v3">
              <button type="button" className="btn btn--primary" onClick={() => navigate('/goal')}>
                Go to Goals
              </button>
            </div>
          )}
          {ai.button}
        </>
      )}
      <ChartCard
        title="Calories"
        aside={band ? `band ${Math.round(band.low).toLocaleString('en-US')} to ${Math.round(band.high).toLocaleString('en-US')}` : 'no target yet'}
        legend={[
          { label: 'In range', tone: 'sage' },
          { label: 'Outside', tone: 'soft' },
          { label: 'Not logged', tone: 'line', dashed: true },
        ]}
      >
        <WeekBars
          label="Daily calories against the band"
          max={kcalMax}
          band={band}
          target={targets.kcal}
          days={allDays.map((d) => ({ key: d.date, value: d.kcal, tone: !d.logged ? 'none' : d.inBand || !band ? 'in' : 'out' }))}
        />
        <DayLabels labels={letters} />
      </ChartCard>
      <ChartCard title="Protein and fiber" aside="filled = at target">
        <DotRow label="Protein" days={allDays.map((d) => (!d.logged || targets.proteinG === undefined ? 'none' : d.atProtein ? 'at' : 'below'))} />
        <DotRow label="Fiber" days={allDays.map((d) => (!d.logged || fibre === undefined ? 'none' : d.atFibre ? 'at' : 'below'))} />
        <div className="dot-row">
          <span className="dot-row__label" />
          <DayLabels labels={letters} />
        </div>
      </ChartCard>
      <ChartCard title="Sodium" aside={`limit ${SODIUM_LIMIT_MG.toLocaleString('en-US')} mg`}>
        <WeekBars
          label="Daily sodium against the limit"
          max={sodiumMax}
          limit={SODIUM_LIMIT_MG}
          days={allDays.map((d) => ({ key: d.date, value: d.sodiumMg, tone: d.sodiumMg === undefined ? 'none' : d.sodiumMg >= SODIUM_LIMIT_MG ? 'out' : 'in' }))}
        />
        <DayLabels labels={letters} />
      </ChartCard>
      {how && <HowItWorks title="How the nutrition score works" rows={NUTRITION_HOW} onClose={() => setHow(false)} />}
    </>
  )
}

function missingNote(c: NutritionCounts): string {
  const out = [!c.hasEnergyTarget && 'Calorie range', !c.hasProteinTarget && 'protein', !c.hasFibreTarget && 'fiber'].filter(Boolean) as string[]
  const kept = ['logging', c.hasEnergyTarget && 'calorie range', c.hasProteinTarget && 'protein', c.hasFibreTarget && 'fiber'].filter(Boolean) as string[]
  const list = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0])
  const head = list(out)
  return `${head[0].toUpperCase()}${head.slice(1)} ${out.length > 1 ? 'drop' : 'drops'} out, and ${list(kept)} ${kept.length > 1 ? 'share their' : 'takes the'} weight until then.`
}

const MEASURE_NAME: Record<string, string> = { skeletalMuscle: 'Muscle', bodyFatMass: 'Fat mass', bodyFatPct: 'Body fat', weight: 'Weight' }

/** Muscle first, as frame 3.10 reads. */
function shownMeasures(comparison: BodyComparison): BodyComparison['measures'] {
  return [...comparison.measures].sort((a, b) => (a.measure === 'skeletalMuscle' ? -1 : b.measure === 'skeletalMuscle' ? 1 : 0))
}

function bodySentence(comparison: BodyComparison): string {
  const words = shownMeasures(comparison).map((m) => {
    const noun = m.measure === 'skeletalMuscle' ? 'muscle' : m.measure === 'bodyFatPct' ? 'body fat' : 'fat'
    if (m.change === 0) return `${noun} level`
    const more = m.change > 0
    return m.beyond ? `${more ? 'more' : 'less'} ${noun}` : `a little ${more ? 'more' : 'less'} ${noun}`
  })
  const text = words.join(', ')
  return `${text[0].toUpperCase()}${text.slice(1)}.`
}

function BodyView({ program, t, data, units }: { program: Program | null; t: Timeline | null; data: Data; units: 'kg' | 'lb' }) {
  const navigate = useNavigate()
  const [how, setHow] = useState(false)
  const ref = t?.review ?? null
  const label = ref?.label ?? 'Week 1'
  const asOf = ref ? toISODate(ref.dates[6]) : undefined
  const measures = bodyMeasures(data.goals)
  const comparison = bodyComparison(data.body, measures, units, asOf)
  const score = bodyScore(comparison)
  const goal = mainGoal(data.goals)
  const read = (field: BodyField) => (e: BodyEntry) => valueIn(e, field, units)
  const weights = bodySeries(data.body, read('weight'))
  const average = sevenDayAverage(weights)
  const muscle = bodySeries(data.body, read('skeletalMuscle'))
  const fat = bodySeries(data.body, read('bodyFatMass'))
  const tape = BODY_FIELDS.filter((f) => f.group === 'tape').map((f) => ({ f, points: bodySeries(data.body, read(f.field)) })).filter((t) => t.points.length > 0)
  const ai = useWeekReview({
    enabled: data.body.length > 0 && Boolean(program),
    review: {
      view: 'body',
      weekStart: ref ? toISODate(ref.dates[0]) : '',
      ...(ref ? { programWeek: ref.week } : {}),
      score,
      parts: comparison ? shownMeasures(comparison).map((m) => ({ label: MEASURE_NAME[m.measure], value: `${m.change > 0 ? '+' : ''}${m.change} (${m.beyond ? 'beyond' : 'within'} normal day-to-day change)` })) : [],
      data: bodyWeekData(comparison),
      summary: [{ label: 'Body', value: comparison ? 'Muscle and fat mass change behind the score' : 'Trends only' }],
    },
    data: { program: null, sessions: [], goals: data.goals, bodyEntries: data.body },
  })
  if (ai.picking) return <>{ai.element}</>

  if (data.body.length === 0) {
    return (
      <EmptyState
        title="No entries yet"
        body="A scale weigh-in is one field. A full scan takes under a minute. The body score needs two entries about four weeks apart."
        action={{ label: 'Add your first entry', onClick: () => navigate('/body/new') }}
      />
    )
  }

  return (
    <>
      {measures.length === 0 ? (
        <section className="card-v3 score-card score-card--empty">
          <div className="score-card__text">
            <span className="score-card__week">{label} · body</span>
            <span className="score-card__sentence">
              {goal === 'lose_weight'
                ? 'Trends only for now: there’s no reliable day-to-day range for weight yet, so losing weight has no body score.'
                : goal === null
                  ? 'Set a goal to get a body score. These are your trends.'
                  : 'Your main goal has no body score. These are your trends.'}
            </span>
          </div>
        </section>
      ) : comparison ? (
        <>
          <ScoreCard score={score} label={label} view="body" sentence={bodySentence(comparison)} />
          {ai.notes}
          <section className="card-v3 parts">
            {shownMeasures(comparison).map((m) => (
              <span className="part__text" key={m.measure}>
                {MEASURE_NAME[m.measure]} {m.change > 0 ? '+' : m.change < 0 ? '−' : '±'}
                {Math.abs(m.change).toFixed(1)} {m.measure === 'bodyFatPct' ? 'points' : units} ({m.beyond ? 'beyond' : 'within'} normal day-to-day change)
              </span>
            ))}
            <button type="button" className="btn btn--tertiary how-link" onClick={() => setHow(true)}>
              How this is worked out
            </button>
          </section>
        </>
      ) : (
        <section className="card-v3 score-card score-card--empty">
          <div className="score-card__text">
            <span className="score-card__week">{label} · body</span>
            <span className="score-card__sentence">The body score needs two entries about four weeks apart.</span>
          </div>
        </section>
      )}
      {weights.length > 0 && (
        <ChartCard
          title="Weight"
          aside={`7-day average ${formatValue(average[average.length - 1].value, 'mass')} ${units}`}
          legend={[
            { label: 'Each weigh-in', tone: 'soft' },
            { label: '7-day average', tone: 'sage' },
          ]}
        >
          <LineChart label="Weight with a 7-day average" series={[{ points: weights, tone: 'soft', dots: true }, { points: average, tone: 'sage' }]} />
        </ChartCard>
      )}
      {(muscle.length > 0 || fat.length > 0) && (
        <ChartCard
          title="Muscle and fat mass"
          aside={units}
          legend={[
            { label: 'Skeletal muscle', tone: 'sage' },
            { label: 'Body fat mass', tone: 'soft' },
          ]}
        >
          <LineChart label="Skeletal muscle and body fat mass" series={[{ points: muscle, tone: 'sage' }, { points: fat, tone: 'soft' }]} />
        </ChartCard>
      )}
      <ChartCard title="Tape measurements" aside={tape.length ? unitLabel('length', units) : undefined}>
        {tape.length === 0 ? (
          <>
            <p className="chart-empty">No tape entries yet. Add waist, chest, hips, upper arm or thigh to see them here.</p>
            <button type="button" className="chip" onClick={() => navigate('/body/new')}>
              Add a measurement
            </button>
          </>
        ) : (
          tape.map(({ f, points }) => (
            <div className="lift" key={f.field}>
              <div className="lift__head">
                <span>{f.label}</span>
                <b>
                  {formatValue(points[points.length - 1].value, 'length')} {unitLabel('length', units)}
                </b>
              </div>
              <LineChart series={[{ points, tone: 'sage' }]} height={48} label={`${f.label} over time`} />
            </div>
          ))
        )}
      </ChartCard>
      {ai.button}
      {ai.element}
      {how && <HowItWorks title="How the body score works" rows={BODY_HOW} onClose={() => setHow(false)} />}
    </>
  )
}

/** Progress > Training, Nutrition or Body. */
export function ProgressScreen({ view }: { view: ProgressView }) {
  const { program, today, changes } = useProgram()
  const { settings, loading } = useSettings()
  const data = useData()
  const t = useMemo(() => (program && data ? timelineOf(program, data, today) : null), [program, data, today])
  // D-096 rule 6: the header holds the week alone; the score card under it names the program.
  const context = t ? (t.first ? 'Week 1 so far' : `Week ${t.review.week} review`) : undefined
  return (
    <div className="screen">
      <ProgressHeader view={view} context={context} />
      {data && !loading && (
        <>
          {view === 'training' &&
            (program ? (
              <TrainingView program={program} t={t!} data={data} today={today} changes={changes} units={unitsOf(settings)} />
            ) : (
              <EmptyState title="No program yet" body="Your training score appears once you have a program and a full week behind you." />
            ))}
          {view === 'nutrition' && <NutritionView program={program} t={t} data={data} today={today} />}
          {view === 'body' && <BodyView program={program} t={t} data={data} units={unitsOf(settings)} />}
        </>
      )}
    </div>
  )
}
