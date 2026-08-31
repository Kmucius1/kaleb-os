// Fuel data access. The estimating and the trend maths are pure and live in
// ./estimate and ./trends; this is the part that talks to Postgres and storage.

import { supabase } from '../supabase'
import { templateForDate } from '../rhythm/template'
import { sumItems, type FuelItem, type Totals } from './estimate'
import type { DayFuel } from './trends'

export * from './estimate'
export * from './trends'

export const BUCKET = 'fuel'

export const etToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())

const addDays = (dateStr: string, n: number) => {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export type MealRow = {
  id: string
  eaten_at: string
  meal_date: string
  slot: string | null
  photo_path: string | null
  status: 'estimated' | 'confirmed'
  confidence: number | null
  note: string | null
  items: (FuelItem & { id: string; edited: boolean })[]
} & Totals

/** A signed URL for a private photo, or null. Never throws — a missing photo
 *  must not stop a meal from rendering. */
export async function photoUrl(path: string | null, seconds = 3600): Promise<string | null> {
  if (!path) return null
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds)
  return data?.signedUrl ?? null
}

export async function getMeals(from: string, to: string): Promise<MealRow[]> {
  const { data: meals } = await supabase
    .from('meals').select('*').gte('meal_date', from).lte('meal_date', to)
    .order('eaten_at', { ascending: false })
  if (!meals?.length) return []

  const { data: items } = await supabase
    .from('meal_items').select('*').in('meal_id', meals.map((m: { id: string }) => m.id))
    .order('sort_order')

  type ItemRow = MealRow['items'][number] & { meal_id: string }
  const byMeal = new Map<string, MealRow['items']>()
  for (const i of (items ?? []) as ItemRow[]) {
    const list = byMeal.get(i.meal_id) ?? byMeal.set(i.meal_id, []).get(i.meal_id)!
    list.push(i)
  }
  return (meals as MealRow[]).map(m => ({ ...m, items: byMeal.get(m.id) ?? [] }))
}

/** Recompute a meal's totals from its items and write them back. The items are
 *  the source of truth — correcting a portion must move the total. */
export async function recomputeMeal(mealId: string): Promise<Totals> {
  const { data: items } = await supabase.from('meal_items').select('*').eq('meal_id', mealId)
  const totals = sumItems((items ?? []) as FuelItem[])
  await supabase.from('meals').update(totals).eq('id', mealId)
  return totals
}

/**
 * One row per day: confirmed nutrition, the body habits, and whether the gym
 * actually happened.
 *
 * Only CONFIRMED meals contribute. An estimate nobody has looked at is not a
 * fact, and letting it feed a trend would quietly turn a guess into evidence.
 */
export async function getDayFuel(from: string, to: string): Promise<DayFuel[]> {
  const [mealsRes, habitDefs, habitLogs, comps] = await Promise.all([
    supabase.from('meals')
      .select('meal_date,calories,protein_g,carbs_g,fat_g,fiber_g,produce_servings')
      .eq('status', 'confirmed').gte('meal_date', from).lte('meal_date', to),
    supabase.from('habits').select('id,name').in('name', ['Body Weight', 'Hydration', 'Sleep']),
    supabase.from('habit_logs').select('habit_id,log_date,value').gte('log_date', from).lte('log_date', to),
    supabase.from('completions').select('ref_id,done_date').eq('ref_type', 'block').eq('ref_id', 'gym')
      .gte('done_date', from).lte('done_date', to),
  ])

  const nameOf = new Map<string, string>((habitDefs.data ?? []).map((h: { id: string; name: string }) => [h.id, h.name]))
  const trainedOn = new Set((comps.data ?? []).map((c: { done_date: string }) => c.done_date))

  const out = new Map<string, DayFuel>()
  for (let d = from; d <= to; d = addDays(d, 1)) {
    // trained is null on a day the rhythm never asked for a session, so a
    // scheduled rest day can never read as a missed workout.
    const asks = templateForDate(d).some(b => b.key === 'gym')
    out.set(d, {
      date: d, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, produce_servings: 0,
      meals: 0, weight_lb: null, water_oz: null, sleep_h: null,
      trained: asks ? trainedOn.has(d) : null,
    })
  }

  for (const m of (mealsRes.data ?? []) as (Totals & { meal_date: string })[]) {
    const d = out.get(m.meal_date)
    if (!d) continue
    d.calories += Number(m.calories) || 0
    d.protein_g += Number(m.protein_g) || 0
    d.carbs_g += Number(m.carbs_g) || 0
    d.fat_g += Number(m.fat_g) || 0
    d.fiber_g += Number(m.fiber_g) || 0
    d.produce_servings += Number(m.produce_servings) || 0
    d.meals += 1
  }

  for (const l of (habitLogs.data ?? []) as { habit_id: string; log_date: string; value: number }[]) {
    const d = out.get(l.log_date)
    const name = nameOf.get(l.habit_id)
    if (!d || !name) continue
    const v = Number(l.value)
    if (!Number.isFinite(v) || v <= 0) continue
    if (name === 'Body Weight') d.weight_lb = v
    else if (name === 'Hydration') d.water_oz = v
    else if (name === 'Sleep') d.sleep_h = v
  }

  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** Confirmed protein for one day — what the Today card's Nutrition row reads. */
export async function proteinToday(dateStr = etToday()): Promise<number> {
  const { data } = await supabase.from('meals').select('protein_g')
    .eq('status', 'confirmed').eq('meal_date', dateStr)
  return (data ?? []).reduce((s: number, m: { protein_g: number }) => s + (Number(m.protein_g) || 0), 0)
}
