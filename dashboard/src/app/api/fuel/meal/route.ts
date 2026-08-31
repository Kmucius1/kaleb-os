import { supabase } from '@/lib/supabase'
import { recomputeMeal, photoUrl } from '@/lib/fuel'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Item = z.object({
  id: z.string().uuid(),
  qty: z.number().nonnegative().nullable().optional(),
  unit: z.string().max(24).nullable().optional(),
  calories: z.number().nonnegative().optional(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  fiber_g: z.number().nonnegative().optional(),
  produce_servings: z.number().nonnegative().optional(),
  /** Remove a food the model saw that was not actually there. */
  remove: z.boolean().optional(),
})

const Body = z.object({
  id: z.string().uuid(),
  items: z.array(Item).max(30).optional(),
  note: z.string().max(500).nullable().optional(),
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable().optional(),
  /** Confirming is the act that turns an estimate into something the day counts. */
  confirm: z.boolean().optional(),
})

// Read one meal with its items. The capture response carries the estimate but
// not the row ids, and a correction needs something to address.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })
  const { data: meal } = await supabase.from('meals').select('*').eq('id', id).maybeSingle()
  if (!meal) return Response.json({ error: 'No such meal.' }, { status: 404 })
  const { data: items } = await supabase.from('meal_items').select('*').eq('meal_id', id).order('sort_order')
  return Response.json({
    ok: true,
    meal: { ...meal, items: items ?? [], photo_url: await photoUrl(meal.photo_path) },
  })
}

// Correct the portions, then confirm.
//
// Items are the source of truth: every edit recomputes the meal's totals from
// them, so a corrected portion always moves the number. An edited item is
// flagged, because a correction is evidence about the model — not just a
// better value.
export async function PATCH(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })
  const { id, items, note, slot, confirm } = parsed.data

  const { data: meal } = await supabase.from('meals').select('id').eq('id', id).maybeSingle()
  if (!meal) return Response.json({ error: 'No such meal.' }, { status: 404 })

  for (const item of items ?? []) {
    const { id: itemId, remove, ...fields } = item
    if (remove) {
      await supabase.from('meal_items').delete().match({ id: itemId, meal_id: id })
      continue
    }
    const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))
    if (Object.keys(patch).length === 0) continue
    // A human touched this one. Worth knowing later when judging the model.
    await supabase.from('meal_items').update({ ...patch, edited: true }).match({ id: itemId, meal_id: id })
  }

  const totals = await recomputeMeal(id)

  const metaPatch: Record<string, unknown> = {}
  if (note !== undefined) metaPatch.note = note
  if (slot !== undefined) metaPatch.slot = slot
  if (confirm) metaPatch.status = 'confirmed'
  if (Object.keys(metaPatch).length) await supabase.from('meals').update(metaPatch).eq('id', id)

  const { data: fresh } = await supabase.from('meals').select('*').eq('id', id).single()
  const { data: freshItems } = await supabase.from('meal_items').select('*').eq('meal_id', id).order('sort_order')

  return Response.json({
    ok: true,
    totals,
    meal: { ...fresh, items: freshItems ?? [], photo_url: await photoUrl(fresh?.photo_path ?? null) },
  })
}

// Delete a meal outright (wrong photo, duplicate). The photo goes with it —
// leaving orphaned images of someone's food in a bucket is not tidy.
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const { data: meal } = await supabase.from('meals').select('photo_path').eq('id', id).maybeSingle()
  if (meal?.photo_path) await supabase.storage.from('fuel').remove([meal.photo_path])

  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
