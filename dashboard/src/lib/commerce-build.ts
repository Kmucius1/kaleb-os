// Commerce Phase 2 — the "approve -> live" orchestrator.
// A resumable state machine: each of the four steps is idempotent (skips if
// its output columns are already populated, unless `force`), so a failed or
// interrupted build re-runs safely. All DB writes are per-column — never a
// whole-row overwrite. The `page` step is the only fatal one (the landing
// page is the deliverable); sourcing/listing/finalize degrade gracefully so
// one bad step never blocks the rest of the pipeline.

import { supabase } from '@/lib/supabase'
import { sendPushToAll, claimOnce } from '@/lib/push'
import { generateLandingCopy } from '@/lib/commerce-landing'
import { getSourcingProvider, getStoreProvider } from '@/lib/commerce-providers'
import type { BuildProduct, SupplierMatch } from '@/lib/commerce-providers/types'

export type BuildStep = 'sourcing' | 'listing' | 'page' | 'finalize'

export type BuildResult = {
  ok: boolean
  productId: string
  buildStatus: 'ready' | 'live' | 'failed'
  stepsRun: BuildStep[]
  landingPageUrl?: string
  manualStepRequired?: boolean
  error?: string
}

const ALL_STEPS: BuildStep[] = ['sourcing', 'listing', 'page', 'finalize']

// Loosely-typed row shape for the columns this module reads/writes. The
// service-role `supabase` client is untyped project-wide — cast at the edge.
type ProductRow = {
  id: string
  name: string
  slug: string | null
  description: string | null
  category: string | null
  image_url: string | null
  source_url: string | null
  supplier_cost: number | null
  supplier_cost_real: number | null
  suggested_price: number | null
  scores: Record<string, { score: number; note: string }> | null
  reasoning: string | null
  status: string | null
  supplier_url: string | null
  supplier_source: string | null
  shipping_days: number | null
  sourcing_notes: unknown
  shopify_product_id: string | null
  checkout_url: string | null
  landing_copy: unknown
  landing_page_url: string | null
  [key: string]: unknown
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

async function logEvent(
  productId: string,
  step: BuildStep | 'manual',
  status: 'start' | 'ok' | 'skip' | 'manual_required' | 'error',
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('commerce_build_events').insert({
      product_id: productId,
      step,
      status,
      detail: detail ?? {},
    })
  } catch {
    // Logging must never abort a build.
  }
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === '23505' || /duplicate key value/i.test(error.message || '')
}

function slugify(name: string): string {
  return (
    (name || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product'
  )
}

// Slugify the product name and claim it in the DB, retrying with -2, -3, ...
// on a unique-index collision. Always returns a persisted, unique slug.
async function ensureSlug(row: ProductRow): Promise<string> {
  const base = slugify(row.name)
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
    const { error } = await supabase.from('commerce_products').update({ slug: candidate }).eq('id', row.id)
    if (!error) return candidate
    if (!isUniqueViolation(error)) throw new Error(`slug update failed: ${error.message}`)
  }
  // Extremely unlikely after 5 tries — fall back to an id-suffixed slug.
  const fallback = `${base}-${String(row.id).replace(/-/g, '').slice(0, 6)}`
  await supabase.from('commerce_products').update({ slug: fallback }).eq('id', row.id)
  return fallback
}

export async function runBuild(
  productId: string,
  opts: { force?: boolean; steps?: BuildStep[]; trigger?: 'approve' | 'manual' } = {}
): Promise<BuildResult> {
  const force = Boolean(opts.force)
  const stepsToRun = opts.steps && opts.steps.length > 0 ? opts.steps : ALL_STEPS
  const runStep = (s: BuildStep) => stepsToRun.includes(s)
  const stepsRun: BuildStep[] = []

  // 1. Load the product row.
  const { data: rowData, error: loadErr } = await supabase
    .from('commerce_products')
    .select('*')
    .eq('id', productId)
    .single()

  if (loadErr || !rowData) {
    return { ok: false, productId, buildStatus: 'failed', stepsRun: [], error: 'not found' }
  }
  const row = rowData as ProductRow

  // 2. Money gate: never build a product Kaleb hasn't approved.
  if (row.status !== 'approved' && row.status !== 'launched') {
    return { ok: false, productId, buildStatus: 'failed', stepsRun: [], error: 'product not approved' }
  }

  // 3. Mark building + build the shared product shape passed to every provider.
  await supabase.from('commerce_products').update({ build_status: 'building', build_error: null }).eq('id', productId)

  const bp: BuildProduct = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    image_url: row.image_url,
    source_url: row.source_url,
    supplier_cost: row.supplier_cost,
    suggested_price: row.suggested_price,
    scores: row.scores ?? {},
    reasoning: row.reasoning,
  }

  // In-memory tracking of fields later steps depend on — updated as each
  // step runs so we never need to re-read the row mid-build.
  let sourcingMatch: SupplierMatch | null = null
  let checkoutUrl: string | null = row.checkout_url ?? null
  let shopifyProductId: string | null = row.shopify_product_id ?? null
  let landingPageUrl: string | null = row.landing_page_url ?? null
  let manualStepRequired = false

  // --- sourcing --------------------------------------------------------
  if (runStep('sourcing')) {
    stepsRun.push('sourcing')
    await logEvent(productId, 'sourcing', 'start')

    if (row.supplier_url && !force) {
      await logEvent(productId, 'sourcing', 'skip')
      sourcingMatch =
        row.sourcing_notes && typeof row.sourcing_notes === 'object'
          ? (row.sourcing_notes as SupplierMatch)
          : null
    } else {
      try {
        const match = await getSourcingProvider().findSupplier(bp)
        await supabase
          .from('commerce_products')
          .update({
            supplier_source: match.supplier,
            supplier_url: match.supplierUrl,
            supplier_cost_real: match.cost,
            shipping_days: match.shippingDays,
            sourcing_notes: match,
          })
          .eq('id', productId)
        sourcingMatch = match
        await logEvent(productId, 'sourcing', 'ok', { supplier: match.supplier, confidence: match.confidence })
      } catch (e) {
        await logEvent(productId, 'sourcing', 'error', { message: errMsg(e) })
        // Non-fatal — sourcing brief can be regenerated later.
      }
    }
  }

  // --- listing -----------------------------------------------------------
  if (runStep('listing')) {
    stepsRun.push('listing')
    await logEvent(productId, 'listing', 'start')

    if (row.shopify_product_id && !force) {
      await logEvent(productId, 'listing', 'skip')
    } else {
      try {
        const listing = await getStoreProvider().createDraftProduct(bp, sourcingMatch)

        const update: Record<string, unknown> = {}
        if (listing.shopifyProductId) update.shopify_product_id = listing.shopifyProductId
        if (listing.variantId) update.shopify_variant_id = listing.variantId
        if (listing.checkoutUrl) update.checkout_url = listing.checkoutUrl
        if (Object.keys(update).length > 0) {
          await supabase.from('commerce_products').update(update).eq('id', productId)
        }
        if (listing.shopifyProductId) shopifyProductId = listing.shopifyProductId
        if (listing.checkoutUrl) checkoutUrl = listing.checkoutUrl

        if (listing.manualStepRequired) {
          manualStepRequired = true
          await logEvent(productId, 'listing', 'manual_required', { notes: listing.notes ?? '' })
        }
        await logEvent(productId, 'listing', 'ok')
      } catch (e) {
        await logEvent(productId, 'listing', 'error', { message: errMsg(e) })
        // Non-fatal — the manual bridge can be completed later via /api/commerce/listing.
      }
    }
  }

  // --- page (FATAL) --------------------------------------------------------
  if (runStep('page')) {
    stepsRun.push('page')
    await logEvent(productId, 'page', 'start')

    if (row.landing_copy && !force) {
      await logEvent(productId, 'page', 'skip')
    } else {
      try {
        const slug = await ensureSlug(row)
        const copy = await generateLandingCopy(bp)
        const url = `${process.env.SITE_URL || 'https://kalebos.app'}/shop/${slug}`

        await supabase
          .from('commerce_products')
          .update({ slug, landing_copy: copy, landing_page_url: url })
          .eq('id', productId)

        landingPageUrl = url
        await logEvent(productId, 'page', 'ok', { slug })
      } catch (e) {
        const msg = errMsg(e)
        await supabase
          .from('commerce_products')
          .update({ build_status: 'failed', build_error: `page: ${msg}` })
          .eq('id', productId)
        await logEvent(productId, 'page', 'error', { message: msg })

        const title = `⚠️ Build failed: ${row.name}`
        if (await claimOnce('commerce_build_failed', productId, title, msg)) {
          await sendPushToAll({
            title,
            body: `page: ${msg}`.slice(0, 180),
            url: `/commerce/${productId}`,
            tag: 'commerce-build',
          })
        }

        return { ok: false, productId, buildStatus: 'failed', stepsRun, error: `page: ${msg}` }
      }
    }
  }

  // --- finalize ------------------------------------------------------------
  let buildStatus: 'ready' | 'live' = 'ready'
  if (runStep('finalize')) {
    stepsRun.push('finalize')
    await logEvent(productId, 'finalize', 'start')

    try {
      if (checkoutUrl) {
        try {
          await getStoreProvider().publishProduct(shopifyProductId ?? '')
        } catch (e) {
          await logEvent(productId, 'finalize', 'error', { message: `publish: ${errMsg(e)}` })
          // Non-fatal — checkout_url already works even if the publish call failed.
        }
        await supabase
          .from('commerce_products')
          .update({ build_status: 'live', status: 'launched', launched_at: new Date().toISOString() })
          .eq('id', productId)
        buildStatus = 'live'
      } else {
        await supabase
          .from('commerce_products')
          .update({ build_status: 'ready', built_at: new Date().toISOString() })
          .eq('id', productId)
        buildStatus = 'ready'
      }
      await logEvent(productId, 'finalize', 'ok', { buildStatus })
    } catch (e) {
      await logEvent(productId, 'finalize', 'error', { message: errMsg(e) })
      // Non-fatal — leave whatever build_status was already persisted.
    }
  }

  // --- completion push (deduped) --------------------------------------------
  const title = `🛍️ Build ${buildStatus === 'live' ? 'live' : 'ready'}: ${row.name}`
  if (await claimOnce('commerce_build', productId, title)) {
    await sendPushToAll({
      title,
      body: checkoutUrl ? 'Live — Buy Now works.' : 'Landing page is up. ~2-min AutoDS import to go live.',
      url: `/commerce/${productId}`,
      tag: 'commerce-build',
    })
  }

  return {
    ok: true,
    productId,
    buildStatus,
    stepsRun,
    ...(landingPageUrl ? { landingPageUrl } : {}),
    manualStepRequired: manualStepRequired || buildStatus === 'ready',
  }
}
