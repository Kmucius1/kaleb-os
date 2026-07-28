import { supabase } from '@/lib/supabase'
import { extractFromEntry, queueProposals } from '@/lib/rhythm/extract'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const Body = z.object({
  journal_id: z.string().uuid(),
})

// Read an entry back, pull structure out of it, and queue anything that would
// create a commitment. Enrichment is written back to the entry when the schema
// supports it; the proposals are returned so the UI can review them inline.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })

  const { data: entry, error } = await supabase
    .from('journal')
    .select('id,content')
    .eq('id', parsed.data.journal_id)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!entry) return Response.json({ error: 'not found' }, { status: 404 })

  const result = await extractFromEntry(String(entry.content ?? ''))

  // A model that couldn't be reached must not look like an empty journal.
  if (!result.ok) {
    return Response.json({ ok: false, reason: result.error, proposals: [] })
  }

  const extracted = result.extracted

  // Best-effort enrichment — pre-0024 these columns don't exist yet.
  await supabase
    .from('journal')
    .update({ summary: extracted.summary, entities: extracted, tags: extracted.tags })
    .eq('id', entry.id)
    .then(undefined, () => undefined)

  const proposals = await queueProposals(String(entry.id), extracted)

  return Response.json({
    ok: true,
    summary: extracted.summary,
    pillar: extracted.pillar,
    tags: extracted.tags,
    wins: extracted.wins,
    decisions: extracted.decisions,
    proposals,
  })
}
