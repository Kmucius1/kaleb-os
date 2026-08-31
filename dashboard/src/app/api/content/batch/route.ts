import { supabase } from '@/lib/supabase'
import { chat } from '@/lib/llm'
import {
  BATCH_SYSTEM, batchPrompt, parseBatch, scheduleSlots,
  nextWeekStart, IDEAS_PER_BATCH, WEEKLY_TARGET,
} from '@/lib/content/batch'
import { etToday } from '@/lib/season'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`)
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}

async function personalBrandId(): Promise<string | null> {
  const { data } = await supabase.from('brands').select('id').eq('slug', 'me').maybeSingle()
  return data?.id ?? null
}

// GET — the current batch and its ideas.
export async function GET(req: Request) {
  const week = new URL(req.url).searchParams.get('week') ?? nextWeekStart(etToday())
  const { data: batch } = await supabase.from('content_batches').select('*').eq('week_start', week).maybeSingle()
  if (!batch) return Response.json({ ok: true, week, batch: null, ideas: [] })

  const { data: ideas } = await supabase.from('content_ideas')
    .select('id,title,angle,hook_options,pillar,selected,recorded_at,scheduled_for,source_note')
    .eq('batch_id', batch.id).order('created_at')
  return Response.json({ ok: true, week, batch, ideas: ideas ?? [] })
}

// POST — generate 28 ideas for next week, grounded in the week just lived.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const week = typeof body?.week === 'string' ? body.week : nextWeekStart(etToday())
  const count = Number(body?.count) || IDEAS_PER_BATCH

  const brandId = await personalBrandId()
  if (!brandId) return Response.json({ error: 'No personal brand ("me") is set up.' }, { status: 400 })

  const { data: existing } = await supabase.from('content_batches').select('*').eq('week_start', week).maybeSingle()
  if (existing && existing.generated > 0 && !body?.regenerate) {
    return Response.json({ error: 'A batch already exists for that week. Pass regenerate:true to replace it.' }, { status: 409 })
  }

  // What actually happened in the week just lived — this is the whole point.
  const today = etToday()
  const from = addDays(today, -7)
  const [jr, tr, cr] = await Promise.all([
    supabase.from('journal').select('entry_date,content,created_at').gte('created_at', `${from}T00:00:00Z`).limit(25),
    supabase.from('trades').select('*').gte('created_at', `${from}T00:00:00Z`).limit(25),
    supabase.from('completions').select('ref_id,done_date').gte('done_date', from).limit(60),
  ])

  const journal = (jr.data ?? []).map((j: { entry_date: string; content: string; created_at: string }) => ({
    date: j.entry_date ?? String(j.created_at).slice(0, 10),
    text: String(j.content ?? ''),
  })).filter(j => j.text.trim())

  const trades = (tr.data ?? []).map((t: Record<string, unknown>) => ({
    date: String(t.created_at ?? '').slice(0, 10),
    text: [t.symbol, t.direction, t.outcome, t.notes].filter(Boolean).join(' · '),
  })).filter(t => t.text.trim())

  const wins = Object.entries(
    (cr.data ?? []).reduce((acc: Record<string, number>, c: { ref_id: string }) => {
      acc[c.ref_id] = (acc[c.ref_id] ?? 0) + 1
      return acc
    }, {}),
  ).map(([key, n]) => `${key} completed ${n}x this week`)

  let raw: string
  try {
    raw = await chat(
      [
        { role: 'system', content: BATCH_SYSTEM },
        { role: 'user', content: batchPrompt({ count, weekStart: week, journal, trades, wins }) },
      ],
      { jsonMode: true, temperature: 0.9, maxTokens: 6000 },
    )
  } catch (e) {
    return Response.json({ error: `Idea generation failed: ${(e as Error).message}` }, { status: 502 })
  }

  let ideas
  try {
    ideas = parseBatch(raw)
  } catch (e) {
    return Response.json({ error: (e as Error).message, raw: raw.slice(0, 400) }, { status: 422 })
  }

  const batchId = existing?.id ?? (await supabase.from('content_batches')
    .insert({ week_start: week, status: 'selecting', target: WEEKLY_TARGET, generated: 0 })
    .select().single()).data?.id
  if (!batchId) return Response.json({ error: 'Could not create the batch.' }, { status: 500 })

  if (existing) await supabase.from('content_ideas').delete().eq('batch_id', batchId)

  const { error } = await supabase.from('content_ideas').insert(
    ideas.map(i => ({
      brand_id: brandId,
      batch_id: batchId,
      title: i.title,
      angle: i.angle,
      platform: 'reels',
      pillar: i.topic,
      hook_options: i.hook ? [i.hook] : [],
      source_note: i.sourceNote,
      status: 'idea',
      created_by: 'kalebos-batch',
    })),
  )
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabase.from('content_batches')
    .update({ generated: ideas.length, status: 'selecting', updated_at: new Date().toISOString() })
    .eq('id', batchId)

  const { data: saved } = await supabase.from('content_ideas')
    .select('id,title,angle,hook_options,pillar,selected,source_note')
    .eq('batch_id', batchId).order('created_at')

  return Response.json({ ok: true, week, generated: ideas.length, ideas: saved ?? [] })
}

const Patch = z.object({
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  select: z.array(z.string().uuid()).max(60).optional(),
  recorded: z.array(z.string().uuid()).max(60).optional(),
  schedule: z.boolean().optional(),
})

// PATCH — select the 14, mark them recorded, then lay them across the week.
export async function PATCH(req: Request) {
  const parsed = Patch.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })
  const { week, select, recorded, schedule } = parsed.data

  const { data: batch } = await supabase.from('content_batches').select('*').eq('week_start', week).maybeSingle()
  if (!batch) return Response.json({ error: 'No batch for that week.' }, { status: 404 })

  if (select) {
    if (select.length > batch.target) {
      return Response.json(
        { error: `Pick ${batch.target}. You selected ${select.length} — the point of generating 28 is that half get cut.` },
        { status: 400 },
      )
    }
    await supabase.from('content_ideas').update({ selected: false }).eq('batch_id', batch.id)
    if (select.length) {
      await supabase.from('content_ideas').update({ selected: true }).in('id', select).eq('batch_id', batch.id)
    }
  }

  if (recorded?.length) {
    await supabase.from('content_ideas')
      .update({ recorded_at: new Date().toISOString(), status: 'scripted' })
      .in('id', recorded).eq('batch_id', batch.id)
  }

  if (schedule) {
    const { data: chosen } = await supabase.from('content_ideas')
      .select('id').eq('batch_id', batch.id).eq('selected', true).order('created_at')
    const ids = (chosen ?? []).map((c: { id: string }) => c.id)

    const { data: cfg } = await supabase.from('kalebos_config').select('value').eq('key', 'content_post_times').maybeSingle()
    let times: string[] = ['09:00', '18:00']
    try { const p = JSON.parse(cfg?.value ?? '[]'); if (Array.isArray(p) && p.length) times = p } catch { /* defaults */ }

    const slots = scheduleSlots(week, ids.length, times)
    await Promise.all(ids.map((id, n) =>
      supabase.from('content_ideas').update({ scheduled_for: slots[n] }).eq('id', id),
    ))
    await supabase.from('content_batches')
      .update({ status: 'scheduled', updated_at: new Date().toISOString() }).eq('id', batch.id)
  }

  const { data: ideas } = await supabase.from('content_ideas')
    .select('id,title,angle,hook_options,pillar,selected,recorded_at,scheduled_for,source_note')
    .eq('batch_id', batch.id).order('created_at')
  const { data: fresh } = await supabase.from('content_batches').select('*').eq('id', batch.id).single()

  return Response.json({ ok: true, batch: fresh, ideas: ideas ?? [] })
}
