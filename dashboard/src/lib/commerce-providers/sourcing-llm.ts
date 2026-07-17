// Commerce Phase 2 — 2a sourcing adapter (zero external deps).
// Uses the web-grounded LLM to find real, currently-listed AliExpress/CJ
// Dropshipping candidates for a product. Never throws — always resolves to
// a SupplierMatch (a low-confidence fallback when nothing usable is found),
// so the orchestrator can treat sourcing as a non-fatal step.

import { chat, LLM_MODEL } from '@/lib/llm'
import { extractJsonArray } from '@/lib/commerce'
import type { BuildProduct, SourcingProvider, SupplierMatch } from './types'

const ONLINE_MODEL = `${LLM_MODEL}:online`

const SYSTEM_PROMPT = `You are a dropshipping sourcing agent. Find up to 3 REAL, currently-listed AliExpress or CJ Dropshipping listings that match the product. Prefer 4.7★+ sellers and fast US-warehouse/ePacket shipping. Return ONLY a JSON array (no prose), best match first: [{"supplier":"aliexpress"|"cjdropshipping","supplierUrl":"...","cost":number_usd,"shippingDays":number|null,"confidence":"high"|"medium"|"low","notes":"one-line why"}]`

type RawCandidate = {
  supplier?: string
  supplierUrl?: string
  cost?: number
  shippingDays?: number | null
  confidence?: string
  notes?: string
}

function looksLikeUrl(u: unknown): u is string {
  return typeof u === 'string' && /^https?:\/\/.+/i.test(u.trim())
}

function normalizeSupplier(s: unknown): 'aliexpress' | 'cjdropshipping' {
  return String(s || '').toLowerCase().includes('cj') ? 'cjdropshipping' : 'aliexpress'
}

function normalizeConfidence(c: unknown): 'high' | 'medium' | 'low' {
  const v = String(c || '').toLowerCase()
  if (v === 'high' || v === 'medium' || v === 'low') return v
  return 'low'
}

function fallbackMatch(product: BuildProduct, reason: string): SupplierMatch {
  return {
    supplier: 'aliexpress',
    supplierUrl: '',
    cost: product.supplier_cost ?? 0,
    shippingDays: null,
    confidence: 'low',
    notes: `No verifiable supplier candidate found (${reason}) — manual sourcing needed. Search AliExpress/CJ Dropshipping directly for "${product.name}".`,
  }
}

export class LlmSourcingProvider implements SourcingProvider {
  readonly name = 'llm-web'

  async findSupplier(product: BuildProduct): Promise<SupplierMatch> {
    try {
      const user = `PRODUCT TO SOURCE:
name: ${product.name}
${product.description ? `description: ${product.description}\n` : ''}${product.category ? `category: ${product.category}\n` : ''}${product.supplier_cost != null ? `scout-estimated supplier cost: $${product.supplier_cost}\n` : ''}${product.suggested_price != null ? `scout-suggested retail price: $${product.suggested_price}\n` : ''}
Find real, currently-listed supplier candidates now.`

      const raw = await chat(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: user },
        ],
        { model: ONLINE_MODEL, temperature: 0.3 }
      )

      const candidates = extractJsonArray<RawCandidate>(raw).filter(
        (c) => c && looksLikeUrl(c.supplierUrl)
      )

      if (candidates.length === 0) {
        return fallbackMatch(product, 'no parsable candidate with a valid URL')
      }

      const [best, ...rest] = candidates
      const confidence = looksLikeUrl(best.supplierUrl) ? normalizeConfidence(best.confidence) : 'low'

      const alternates = rest.slice(0, 2).map((c) => ({
        supplierUrl: looksLikeUrl(c.supplierUrl) ? c.supplierUrl! : '',
        cost: Number(c.cost) || 0,
        notes: String(c.notes || '').slice(0, 200),
      }))

      const supplier = normalizeSupplier(best.supplier)
      const cost = Number(best.cost) || product.supplier_cost || 0
      const shippingDays =
        best.shippingDays != null && Number.isFinite(Number(best.shippingDays))
          ? Math.round(Number(best.shippingDays))
          : null

      const notesLines = [
        `Sourcing brief: ${supplier} candidate at $${cost.toFixed(2)}${shippingDays != null ? `, ~${shippingDays}d shipping` : ''}.`,
        best.notes ? String(best.notes).slice(0, 240) : '',
        alternates.length > 0 ? `${alternates.length} alternate(s) also found.` : '',
      ].filter(Boolean)

      return {
        supplier,
        supplierUrl: best.supplierUrl!,
        cost,
        shippingDays,
        confidence,
        notes: notesLines.join(' '),
        ...(alternates.length > 0 ? { alternates } : {}),
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return fallbackMatch(product, `lookup error: ${msg.slice(0, 160)}`)
    }
  }
}
