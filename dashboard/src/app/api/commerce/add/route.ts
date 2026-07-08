import { scoreProduct } from '@/lib/commerce'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

// Kaleb feeds a product idea. It goes through the SAME success-rate model as the
// scout — nothing skips the gate. Winners land 'queued' for approval; the rest
// are 'scored' (watchlist) or disqualified.
export async function POST(request: Request) {
  let body: { name?: string; url?: string; description?: string; notes?: string; category?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }
  const name = (body.name || '').trim()
  if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

  const result = await scoreProduct({
    name,
    description: body.description,
    category: body.category,
    source_url: body.url,
    notes: body.notes,
  })

  const status = result.verdict === 'winner' ? 'queued' : 'scored'
  const { data, error } = await supabase
    .from('commerce_products')
    .insert({
      name,
      description: body.description ?? null,
      category: result.category,
      source: 'manual',
      source_url: body.url ?? null,
      supplier_cost: result.supplier_cost,
      suggested_price: result.suggested_price,
      est_margin: result.est_margin,
      scores: result.scores,
      score_total: result.score_total,
      success_probability: result.success_probability,
      verdict: result.verdict,
      reasoning: result.reasoning,
      disqualified: result.disqualified,
      disqualify_reason: result.disqualify_reason,
      status,
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, id: data?.id, result })
}
