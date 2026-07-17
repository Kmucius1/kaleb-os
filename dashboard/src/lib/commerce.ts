// Product Scout engine — discovery + the research-grounded success-rate model.
// The LLM only supplies per-factor JUDGMENT (1–10 + a note) and economics estimates;
// the weighted math, gate cap, disqualifier enforcement and verdict are deterministic here.

import { chat, chatJSON, LLM_MODEL } from './llm';
import { supabase } from './supabase';
import {
  FACTORS, GATE_FACTOR_IDS, GATE_CAP, WINNER_MIN, MAYBE_MIN, DISQUALIFIERS,
  TARGETS, TRENDING_CATEGORIES, SATURATED_CATEGORIES, compileRubricForPrompt,
} from './commerce-rubric';

const ONLINE_MODEL = `${LLM_MODEL}:online`; // OpenRouter web-grounded variant

export type Candidate = {
  name: string;
  description?: string;
  category?: string;
  source_url?: string;
  image_url?: string;
  supplier_cost?: number;
  suggested_price?: number;
  notes?: string; // free-text context from a manual add
};

export type FactorScore = { score: number; note: string };

export type ScoreResult = {
  category: string | null;
  supplier_cost: number | null;
  suggested_price: number | null;
  est_margin: number | null;
  scores: Record<string, FactorScore>;
  score_total: number;        // 0–100 weighted, gate-capped
  success_probability: number; // 0–100
  verdict: 'winner' | 'maybe' | 'pass';
  reasoning: string;
  disqualified: boolean;
  disqualify_reason: string | null;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function scoringSystemPrompt(): string {
  return `You are the Product Scout for an autonomous dropshipping operation. You evaluate a single product
candidate against a research-grounded model and return STRICT JSON. Be skeptical and realistic — most
products are NOT winners. Base every judgment on 2025–2026 paid-social dropshipping reality.

SCORE EACH FACTOR 1–10 (integers) with a terse one-line justification:
${compileRubricForPrompt()}

ECONOMICS: estimate realistic supplier_cost (USD sourcing cost) and suggested_price (impulse retail).
Targets for reference: markup ${TARGETS.markupMin}x min / ${TARGETS.markupIdeal}x ideal; impulse band
$${TARGETS.priceBand[0]}–$${TARGETS.priceBand[1]}; supplier cost ≤ $${TARGETS.supplierCostMax}; net margin
floor ${Math.round(TARGETS.netMarginFloor * 100)}%. est_margin = estimated NET margin fraction (0–1) after ad costs.

HARD DISQUALIFIERS (if ANY clearly applies, set "disqualified": true and name it in "disqualify_reason"):
${DISQUALIFIERS.map((d, i) => `${i + 1}. ${d}`).join('\n')}

CONTEXT — trending categories: ${TRENDING_CATEGORIES.join('; ')}.
Oversaturated/avoid: ${SATURATED_CATEGORIES.join('; ')}.

Return ONLY this JSON shape:
{
  "category": "short category",
  "supplier_cost": number,
  "suggested_price": number,
  "est_margin": number,
  "factors": { ${FACTORS.map(f => `"${f.id}": {"score": 1-10, "note": "..."}`).join(', ')} },
  "disqualified": boolean,
  "disqualify_reason": string | null,
  "reasoning": "2–4 sentence verdict: why it would or wouldn't win, and the single biggest risk."
}`;
}

// Score ONE candidate through the model. Every product goes through this — no exceptions.
export async function scoreProduct(c: Candidate): Promise<ScoreResult> {
  const user = `PRODUCT CANDIDATE:
name: ${c.name}
${c.description ? `description: ${c.description}\n` : ''}${c.category ? `category: ${c.category}\n` : ''}${c.source_url ? `reference: ${c.source_url}\n` : ''}${c.supplier_cost ? `known supplier cost: $${c.supplier_cost}\n` : ''}${c.suggested_price ? `known price: $${c.suggested_price}\n` : ''}${c.notes ? `notes: ${c.notes}\n` : ''}
Score it now.`;

  const raw = await chatJSON<{
    category?: string;
    supplier_cost?: number;
    suggested_price?: number;
    est_margin?: number;
    factors?: Record<string, { score?: number; note?: string }>;
    disqualified?: boolean;
    disqualify_reason?: string | null;
    reasoning?: string;
  }>(scoringSystemPrompt(), user, { temperature: 0.3 });

  // Normalize factor scores.
  const scores: Record<string, FactorScore> = {};
  for (const f of FACTORS) {
    const s = raw.factors?.[f.id];
    scores[f.id] = {
      score: clamp(Math.round(Number(s?.score ?? 5)), 1, 10),
      note: String(s?.note ?? '').slice(0, 240),
    };
  }

  // Deterministic weighted total (0–100).
  let total = FACTORS.reduce((sum, f) => sum + (scores[f.id].score / 10) * f.weight, 0);

  // Soft gate: any make-or-break lever ≤2 caps the grade.
  const gateTripped = GATE_FACTOR_IDS.some(id => scores[id].score <= 2);
  if (gateTripped) total = Math.min(total, GATE_CAP);

  const score_total = Math.round(total * 10) / 10;

  const disqualified = Boolean(raw.disqualified);
  const disqualify_reason = disqualified ? (raw.disqualify_reason || 'Hard disqualifier tripped') : null;

  let verdict: ScoreResult['verdict'];
  if (disqualified) verdict = 'pass';
  else if (score_total >= WINNER_MIN) verdict = 'winner';
  else if (score_total >= MAYBE_MIN) verdict = 'maybe';
  else verdict = 'pass';

  // Success probability: the weighted score, zeroed out on disqualification.
  const success_probability = disqualified ? 0 : Math.round(score_total);

  return {
    category: raw.category ?? c.category ?? null,
    supplier_cost: raw.supplier_cost ?? c.supplier_cost ?? null,
    suggested_price: raw.suggested_price ?? c.suggested_price ?? null,
    est_margin: raw.est_margin ?? null,
    scores,
    score_total,
    success_probability,
    verdict,
    reasoning: String(raw.reasoning ?? '').slice(0, 1200),
    disqualified,
    disqualify_reason,
  };
}

// Discover currently-trending candidate products via web-grounded LLM search.
export async function scoutProducts(count = 6): Promise<Candidate[]> {
  const system = `You are a dropshipping product researcher. Using CURRENT web information, surface real
products that are trending RIGHT NOW on TikTok/Reels and dropshipping trend trackers and are early on
their saturation curve (rising, not yet everywhere). Favor these categories: ${TRENDING_CATEGORIES.join('; ')}.
AVOID oversaturated ones: ${SATURATED_CATEGORIES.join('; ')}. Prefer compact, visually demonstrable,
$20–$50 impulse items with 3x+ markup headroom. Return ONLY a JSON array (no prose):
[{"name":"...","description":"one line on what it is + the wow/problem","category":"...","source_url":"a real reference URL","supplier_cost":estimatedUSD,"suggested_price":estimatedUSD}]`;
  const userMsg = `Give me ${count} distinct trending candidate products to evaluate. Vary the categories. Only real products that exist on AliExpress/CJ-type suppliers.`;

  const raw = await chat(
    [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
    { model: ONLINE_MODEL, temperature: 0.7, maxTokens: 4000 }
  );

  const parsed = extractJsonArray<Candidate>(raw).filter(x => x && x.name).slice(0, count);
  if (parsed.length === 0) console.error('[scout] parse yielded 0; rawlen=%d tail=%s', raw.length, raw.slice(-160));
  return parsed;
}

// Extract the first COMPLETE balanced JSON array from a possibly prose/fence-wrapped
// LLM response. Returns [] on truncation or no array (never throws).
export function extractJsonArray<T>(raw: string): T[] {
  const t = raw.replace(/```(?:json)?/gi, '');
  const start = t.indexOf('[');
  if (start === -1) return [];
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(t.slice(start, i + 1)) as T[]; } catch { return []; }
      }
    }
  }
  return [];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Full scout cycle: discover → score each → dedup → persist → log. Shared by cron + manual button.
export async function runScout(opts: { trigger?: 'cron' | 'manual'; count?: number } = {}) {
  const trigger = opts.trigger ?? 'manual';
  const count = opts.count ?? 6;
  const runRow: Record<string, unknown> = { trigger, model: ONLINE_MODEL, status: 'ok' };

  try {
    const candidates = await scoutProducts(count);
    runRow.candidates_found = candidates.length;

    // Dedup against recent products (last 60 days) by normalized name.
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('commerce_products').select('name').gte('created_at', since);
    const seen = new Set((recent ?? []).map(r => norm(String(r.name))));

    let scored = 0;
    let winners = 0;
    const inserted: { id: string; name: string; verdict: string }[] = [];

    for (const c of candidates) {
      if (seen.has(norm(c.name))) continue;
      seen.add(norm(c.name));
      let result: ScoreResult;
      try {
        result = await scoreProduct(c);
      } catch {
        continue; // one bad score never aborts the run
      }
      scored++;
      if (result.verdict === 'winner') winners++;

      const status = result.verdict === 'winner' ? 'queued' : 'scored';
      const { data: ins } = await supabase
        .from('commerce_products')
        .insert({
          name: c.name,
          description: c.description ?? null,
          category: result.category,
          source: 'scout',
          source_url: c.source_url ?? null,
          image_url: c.image_url ?? null,
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
        .select('id, name, verdict')
        .single();
      if (ins) inserted.push(ins as { id: string; name: string; verdict: string });
    }

    const summary =
      winners > 0
        ? `${winners} winner${winners === 1 ? '' : 's'} queued of ${scored} scored: ${inserted
            .filter(i => i.verdict === 'winner')
            .map(i => i.name)
            .join(', ')}`
        : `Scored ${scored}, no winners this run.`;

    await supabase.from('commerce_scout_runs').insert({
      ...runRow, candidates_scored: scored, winners, summary,
    });

    return { ok: true, found: candidates.length, scored, winners, summary, inserted };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await supabase.from('commerce_scout_runs').insert({
      ...runRow, status: 'error', error, summary: `Scout failed: ${error}`,
    });
    return { ok: false, found: 0, scored: 0, winners: 0, summary: `Scout failed: ${error}`, error };
  }
}
