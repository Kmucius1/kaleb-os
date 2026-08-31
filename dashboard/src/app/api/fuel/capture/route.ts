import { supabase } from '@/lib/supabase'
import { vision, LLM_MODEL } from '@/lib/llm'
import {
  BUCKET, etToday, parseEstimate, sumItems, photoUrl,
  VISION_SYSTEM, VISION_PROMPT,
} from '@/lib/fuel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])

// Photograph a meal → estimate it → save it as UNCONFIRMED.
//
// The meal is written with status 'estimated', which is deliberately not a
// fact: nothing here counts toward the day's nutrition until Kaleb has looked
// at the numbers and confirmed them. That is the whole contract of the feature.
export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: 'Send the photo as multipart form data.' }, { status: 400 })
  }

  const file = form.get('photo')
  if (!(file instanceof File)) return Response.json({ error: 'No photo was attached.' }, { status: 400 })
  if (file.size === 0) return Response.json({ error: 'That photo was empty.' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'That photo is over 10MB. Try again at a smaller size.' }, { status: 413 })
  }
  const mime = file.type || 'image/jpeg'
  if (!ALLOWED.has(mime)) {
    return Response.json({ error: `${mime} isn't a supported image type.` }, { status: 415 })
  }

  const dateStr = typeof form.get('date') === 'string' ? String(form.get('date')) : etToday()
  const slot = typeof form.get('slot') === 'string' ? String(form.get('slot')) : null

  const bytes = Buffer.from(await file.arrayBuffer())
  const base64 = bytes.toString('base64')

  // 1) Estimate first. If the model can't read the plate there is nothing worth
  //    storing, and we shouldn't leave an orphan photo in the bucket.
  let raw: string
  try {
    raw = await vision({
      system: VISION_SYSTEM,
      prompt: VISION_PROMPT,
      image: { base64, mime },
      jsonMode: true,
      // A dozen items with six macros each needs real room; 1200 truncated a
      // busy plate mid-array and surfaced as a confusing parse error.
      maxTokens: 3000,
    })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the vision model: ${(e as Error).message}` }, { status: 502 })
  }

  let estimate
  try {
    estimate = parseEstimate(raw)
  } catch (e) {
    return Response.json({ error: (e as Error).message, raw: raw.slice(0, 400) }, { status: 422 })
  }

  // 2) Keep the photo. A failed upload must not lose the estimate — the numbers
  //    are the point, the image is the receipt.
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/heic' ? 'heic' : 'jpg'
  const path = `${dateStr}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: false })
  const storedPath = up.error ? null : path

  const totals = sumItems(estimate.items)

  const { data: meal, error } = await supabase.from('meals').insert({
    meal_date: dateStr,
    slot,
    photo_path: storedPath,
    source: 'photo',
    status: 'estimated',
    confidence: estimate.confidence,
    note: estimate.note,
    ai_model: LLM_MODEL,
    ai_raw: { response: raw.slice(0, 20000) },
    ...totals,
  }).select().single()

  if (error || !meal) {
    return Response.json({ error: error?.message ?? 'Could not save the meal.' }, { status: 500 })
  }

  const { error: itemErr } = await supabase.from('meal_items').insert(
    estimate.items.map((i, n) => ({
      meal_id: meal.id,
      name: i.name, qty: i.qty, unit: i.unit,
      calories: i.calories, protein_g: i.protein_g, carbs_g: i.carbs_g,
      fat_g: i.fat_g, fiber_g: i.fiber_g, produce_servings: i.produce_servings,
      confidence: i.confidence, sort_order: n,
    })),
  )
  if (itemErr) return Response.json({ error: itemErr.message }, { status: 500 })

  return Response.json({
    ok: true,
    meal: {
      ...meal,
      items: estimate.items,
      photo_url: await photoUrl(storedPath),
      photo_stored: storedPath !== null,
    },
  })
}
