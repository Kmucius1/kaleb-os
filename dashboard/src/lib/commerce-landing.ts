// Commerce Phase 2 — landing-page copywriter.
// Turns a scouted/approved BuildProduct into structured LandingCopy via the LLM,
// then normalizes the result into a strict shape before it ever reaches the
// public template. The public page trusts ONLY this shape — never raw LLM output.

import { chatJSON } from '@/lib/llm'
import type { BuildProduct, LandingCopy } from '@/lib/commerce-providers/types'

const SYSTEM_PROMPT = `You are a direct-response e-commerce copywriter. Write high-converting, truthful landing-page copy for an impulse product sold on a premium independent brand's website. Return STRICT JSON only (no prose, no markdown fences) matching exactly this shape:

{
  "seoTitle": string,               // <= 60 chars, product name + core benefit
  "seoDescription": string,          // <= 160 chars, compelling meta description
  "heroBadge": string,                // short pill label, e.g. "Bestseller" or "New Arrival"
  "headline": string,                 // big, punchy hero headline
  "subhead": string,                  // 1-2 sentence supporting line under the headline
  "bullets": string[],                // 3 to 5 short benefit bullets
  "features": [{ "title": string, "body": string }],   // EXACTLY 3 feature cards
  "socialProof": [{ "quote": string, "name": string }], // 2 to 3 short testimonial quotes with a first-name+initial style name
  "faq": [{ "q": string, "a": string }],                // 4 to 5 frequently-asked-questions
  "guarantee": string,                 // one-line guarantee/return policy statement
  "cta": string,                       // short buy-button label, e.g. "Get Yours Now"
  "urgency": string | null             // short scarcity/urgency line, or null if none fits honestly
}

HARD RULE: NEVER mention or imply the supplier, sourcing, cost, wholesale price, margin, AliExpress, CJ Dropshipping, dropshipping, China, or shipping origin/country. Write as if this is a premium, established brand's own product — never reveal or hint at the fulfillment/sourcing model. Do not make medical or health claims. Do not fabricate specific statistics, study citations, or numeric guarantees you cannot back up (e.g. no "94% of users report..."). Keep every claim plausible and generic-safe.`

function truthy(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0
}

function clampArray<T>(arr: unknown, min: number, max: number, fallback: () => T): T[] {
  const list = Array.isArray(arr) ? arr : []
  const cleaned = list.filter((x) => x != null)
  const out = cleaned.slice(0, max)
  while (out.length < min) out.push(fallback())
  return out as T[]
}

function normalizeLandingCopy(raw: unknown, p: BuildProduct): LandingCopy {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const name = p.name || 'This product'
  const desc = p.description || `${name} — designed to make everyday life easier.`

  const bullets = clampArray<string>(
    r.bullets,
    3,
    5,
    () => 'Built with quality materials for everyday reliability'
  ).map((b) => (truthy(b) ? b : 'A standout benefit customers love'))

  const rawFeatures = Array.isArray(r.features) ? r.features : []
  const features = clampArray<{ title: string; body: string }>(
    rawFeatures,
    3,
    3,
    () => ({ title: 'Quality Build', body: 'Designed and tested to hold up to daily use.' })
  ).map((f) => ({
    title: truthy(f?.title) ? f.title : 'Great Feature',
    body: truthy(f?.body) ? f.body : 'Thoughtfully designed for a better everyday experience.',
  }))

  const rawSocial = Array.isArray(r.socialProof) ? r.socialProof : []
  const socialProof = clampArray<{ quote: string; name: string }>(
    rawSocial,
    2,
    3,
    () => ({ quote: 'Exactly what I needed — works great!', name: 'Happy Customer' })
  ).map((s) => ({
    quote: truthy(s?.quote) ? s.quote : 'Exactly what I needed — works great!',
    name: truthy(s?.name) ? s.name : 'Verified Buyer',
  }))

  const rawFaq = Array.isArray(r.faq) ? r.faq : []
  const faq = clampArray<{ q: string; a: string }>(
    rawFaq,
    4,
    5,
    () => ({ q: 'How long does shipping take?', a: 'Most orders arrive within a week of purchase.' })
  ).map((f) => ({
    q: truthy(f?.q) ? f.q : 'Have a question?',
    a: truthy(f?.a) ? f.a : "We've got you covered — reach out any time.",
  }))

  return {
    seoTitle: truthy(r.seoTitle) ? String(r.seoTitle).slice(0, 70) : name.slice(0, 70),
    seoDescription: truthy(r.seoDescription) ? String(r.seoDescription).slice(0, 200) : desc.slice(0, 200),
    heroBadge: truthy(r.heroBadge) ? String(r.heroBadge) : 'Bestseller',
    headline: truthy(r.headline) ? String(r.headline) : name,
    subhead: truthy(r.subhead) ? String(r.subhead) : desc,
    bullets,
    features,
    socialProof,
    faq,
    guarantee: truthy(r.guarantee) ? String(r.guarantee) : '30-day money-back guarantee.',
    cta: truthy(r.cta) ? String(r.cta) : 'Buy Now',
    urgency: truthy(r.urgency) ? String(r.urgency) : null,
  }
}

export async function generateLandingCopy(p: BuildProduct): Promise<LandingCopy> {
  const price =
    p.suggested_price != null ? `$${Number(p.suggested_price).toFixed(2)}` : 'not yet set'

  const angleNotes = Object.entries(p.scores || {})
    .map(([factorId, v]) => `- ${factorId}: ${v?.note ?? ''}`)
    .filter((line) => line.trim().length > 0)
    .join('\n')

  const user = `Write landing-page copy for this product.

Name: ${p.name}
Category: ${p.category || 'general'}
Description: ${p.description || '(none provided)'}
Price: ${price}

Marketing angle notes (pre-digested factor scoring — ground the copy in these, they capture why this product converts):
${angleNotes || '(none provided)'}

Overall reasoning for why this product was selected:
${p.reasoning || '(none provided)'}

Return ONLY the JSON object described in the system prompt, grounded in the angles above. Do not invent claims that contradict the description.`

  const raw = await chatJSON<Partial<LandingCopy>>(SYSTEM_PROMPT, user, { temperature: 0.6 })
  return normalizeLandingCopy(raw, p)
}
