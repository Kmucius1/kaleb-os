import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Polled by CommerceBuild.tsx while a build is pending/building.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 })
  }

  const [{ data: product, error }, { data: events }] = await Promise.all([
    supabase
      .from('commerce_products')
      .select('build_status,build_error,landing_page_url,checkout_url')
      .eq('id', id)
      .single(),
    supabase
      .from('commerce_build_events')
      .select('step,status,detail,created_at')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (error || !product) {
    return Response.json({ error: error?.message || 'not found' }, { status: 404 })
  }

  return Response.json({
    ok: true,
    build_status: product.build_status,
    build_error: product.build_error,
    landing_page_url: product.landing_page_url,
    checkout_url: product.checkout_url,
    events: events ?? [],
  })
}
