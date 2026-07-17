import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Phase-2a manual bridge: Kaleb pastes a Shopify variant ID or a full
// cart/checkout URL once he's finished the AutoDS/Shopify import by hand,
// and this completes the build — flips the product live.
export async function POST(request: Request) {
  let body: { id?: string; variantId?: string; checkoutUrl?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }
  const { id, variantId, checkoutUrl } = body
  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 })
  }

  let checkout_url: string
  if (checkoutUrl) {
    checkout_url = checkoutUrl
  } else if (variantId && process.env.SHOPIFY_STORE_DOMAIN) {
    checkout_url = `https://${process.env.SHOPIFY_STORE_DOMAIN}/cart/${variantId}:1`
  } else {
    return Response.json({ error: 'provide checkoutUrl, or variantId with SHOPIFY_STORE_DOMAIN set' }, { status: 400 })
  }

  const update: Record<string, unknown> = {
    checkout_url,
    build_status: 'live',
    status: 'launched',
    launched_at: new Date().toISOString(),
  }
  if (variantId) update.shopify_variant_id = variantId

  const { error } = await supabase.from('commerce_products').update(update).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabase.from('commerce_build_events').insert({
    product_id: id,
    step: 'manual',
    status: 'ok',
    detail: { checkout_url },
  })

  return Response.json({ ok: true, checkout_url })
}
