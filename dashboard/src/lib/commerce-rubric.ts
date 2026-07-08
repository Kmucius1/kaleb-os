// Product success-rate scoring model — GROUNDED IN RESEARCH (2025–2026 dropshipping data).
// This is the literal spec the LLM scores against and the code computes from.
// Every product (scouted OR manually fed by Kaleb) passes through this same gate.
//
// Weights sum to 100. Overall score = Σ(factorScore/10 × weight).
// Soft gate: a ≤2 on any GATE factor (margin, demonstrability, saturation) caps the grade.
// Disqualifiers force verdict → 'pass' + disqualified regardless of weighted score.

export type Factor = {
  id: string;
  label: string;
  weight: number;          // percent, all weights sum to 100
  gate?: boolean;          // a make-or-break lever; a ≤2 here caps the overall grade
  why: string;
  low: string;             // what a 1 looks like
  high: string;            // what a 10 looks like
};

export const FACTORS: Factor[] = [
  {
    id: 'demonstrability', label: 'Video Demonstrability / Ad-ability', weight: 14, gate: true,
    why: 'Dropshipping sales are driven by paid short-form video; the first 3s decide ~80% of ad success. A product that "shows itself" can be turned into unlimited cheap UGC ads. Closest thing to a master variable.',
    low: 'Nothing visual happens; benefit is abstract/invisible (supplement, subscription). No natural demo.',
    high: 'Instant wordless visual payoff in <3s (transformation, oddly-satisfying motion, dramatic reveal); multiple obvious hook angles.',
  },
  {
    id: 'margin', label: 'Profit Margin & Markup Headroom', weight: 14, gate: true,
    why: 'Breakeven ROAS = 1 / profit margin. Thin margins need mathematically impossible ad returns. Impulse items must sustain 3x+ ROAS.',
    low: '<2x markup / <15% net after ads (dies within ~6 months).',
    high: '4–5x+ markup, 60%+ gross, "sell the value not the cost" (e.g. $8 cost → $40–60 retail); room for 3x+ ROAS and bundling.',
  },
  {
    id: 'wow', label: 'Wow Factor / Scroll-Stopping Visual', weight: 12,
    why: 'Novelty stops the scroll and generates organic "where do I buy this?" engagement — cheap reach and early virality.',
    low: 'Generic, seen-it-everywhere, blends into the feed.',
    high: 'Genuinely novel/unexpected; visceral "whoa/I need that" in the first frame.',
  },
  {
    id: 'problem', label: 'Solves a Real Problem / Perceived Value', weight: 12,
    why: 'Wow gets the click; problem-solving sustains conversion and cuts refunds. Combining both is the strongest, most scalable profile.',
    low: 'Pure gimmick, no recurring use, buyer’s remorse likely.',
    high: 'Solves a frequent, felt, specific pain; perceived value clearly exceeds price.',
  },
  {
    id: 'saturation', label: 'Saturation / Competition Level', weight: 11, gate: true,
    why: '~41% of new stores fail within 6 months, much from copying saturated products. By the time it’s "everywhere," margin is gone. Sweet spot ~70–85; avoid >90.',
    low: 'Ubiquitous; dozens of identical stores, ads running 30+ days everywhere, race-to-bottom pricing.',
    high: 'Early-curve: rising demand, low store adoption, few active advertisers, no dominant brand yet.',
  },
  {
    id: 'shipping', label: 'Shipping & Fulfillment Profile', weight: 8,
    why: 'Customers expect 7–10 day delivery in 2026; 20–30 day freight produces chargebacks and 1-star reviews. Light/compact/durable = low ship cost + low breakage returns.',
    low: 'Bulky/heavy/fragile, hazmat or battery-restricted, only 20–30 day freight available.',
    high: 'Small, light, durable; US/local or fast-line fulfillment ≤7–10 days available.',
  },
  {
    id: 'tam', label: 'Mass-Market Appeal (TAM)', weight: 8,
    why: 'Bigger addressable audience = cheaper CAC and more room to scale spend before creative fatigue.',
    low: 'Tiny niche, narrow age/gender/interest band.',
    high: 'Cross-demographic, gift-able, "anyone could want this."',
  },
  {
    id: 'price', label: 'Impulse Price Point', weight: 7,
    why: 'The $20–$50 band is the proven impulse sweet spot: high enough for 3x margin, low enough for no-deliberation. <$10 can’t cover CAC; >$70 kills impulse conversion.',
    low: '<$10 (can’t cover CAC) or >$150 (considered purchase).',
    high: '$25–$50 retail with charm pricing (.99/.95) and a bundle/upsell path to $35–80 AOV.',
  },
  {
    id: 'trend', label: 'Trend Trajectory & Demand Signals', weight: 6,
    why: 'Quantitative momentum separates a rising winner from a dying fad: climbing 3-month Google Trends (not a single spike), rising order velocity, multiple independent creators.',
    low: 'Trends spiking-and-crashing or declining; one viral post then silence.',
    high: 'Steady 3-month climb across countries; rising order velocity; multiple organic creators; ads live 7–30 days (validated, not saturated).',
  },
  {
    id: 'returns', label: 'Return / Defect Risk', weight: 4,
    why: 'Return rates >15% destroy profitability. Home/lifestyle <5%; apparel 8–12%. Sizing/fit and fragile electronics inflate returns.',
    low: 'Sizing/fit dependent, fragile, or defect-prone (est. >15% returns).',
    high: 'One-size, durable, no-fit-risk (<5% expected returns).',
  },
  {
    id: 'uniqueness', label: 'Uniqueness / Hard-to-Find Locally', weight: 2,
    why: 'If a buyer can grab it at Target/Walmart tomorrow, the online-impulse urgency and price power evaporate.',
    low: 'Sold in every big-box store locally.',
    high: 'Not stocked locally; effectively "online-only."',
  },
  {
    id: 'seasonality', label: 'Seasonality Profile', weight: 2,
    why: 'Evergreen products compound; pure-seasonal ones are a trap outside their window. Hybrids (evergreen baseline + seasonal spike) are ideal.',
    low: 'Narrow single-season window with no baseline (dead 10 months/year).',
    high: 'Evergreen year-round, ideally with a seasonal gifting spike.',
  },
];

// Make-or-break levers: a score ≤2 on any of these caps the overall grade.
export const GATE_FACTOR_IDS = FACTORS.filter(f => f.gate).map(f => f.id);
export const GATE_CAP = 45; // if a gate factor is ≤2, score_total is capped here

// Verdict thresholds on the 0–100 weighted score.
export const WINNER_MIN = 72; // >= → 'winner' (reaches approval queue)
export const MAYBE_MIN = 55;  // >= → 'maybe' (watchlist), else 'pass'

// Hard disqualifiers — auto-reject regardless of weighted score.
export const DISQUALIFIERS = [
  'Trademark / IP / counterfeit — protected logos, brand names, licensed characters, patented designs.',
  'Restricted/regulated — supplements or cosmetics needing health/disease claims (FDA/FTC), weapons, prescription meds, vape/CBD, adult content.',
  'Margin floor breach — cannot achieve ≥3x markup AND ≥15% net after ads (breakeven ROAS would exceed ~4x).',
  'Fulfillment failure — no supplier can deliver ≤10 days to core market, or hazmat/large-battery/oversized shipping restrictions.',
  'Oversized / heavy / fragile — high ship cost + high breakage-return rate.',
  'Saturation >90 — identical product on dozens of stores, ads 30+ days across many advertisers, race-to-bottom pricing, no differentiation angle.',
  'Sub-$10 sell price with no bundle/upsell path — margins can’t cover CAC ($10–25).',
  'High structural return risk — apparel/footwear needing sizing & fit (>15% returns) with no defensible niche.',
  'Safety/liability — kids’ ingestibles, recall-prone battery electronics, or anything claims-dependent (reject if claims-dependent).',
];

// Pricing / margin targets surfaced in the UI and used as scoring anchors.
export const TARGETS = {
  markupMin: 3, markupIdeal: 5,
  priceBand: [20, 50] as [number, number], priceMaxViable: 70,
  supplierCostMax: 15,
  grossMarginIdeal: 0.6, grossMarginFloor: 0.4,
  netMarginFloor: 0.15, netMarginIdeal: 0.30,
  cacHealthyMax: 25, aovBand: [35, 80] as [number, number],
  shippingDaysMax: 10,
};

// Category intelligence (2026) — nudges/context for the scout & scorer.
export const TRENDING_CATEGORIES = [
  'small-space home organization', 'ergonomic / home-office accessories', 'wellness & personal care (massage, red-light, air purifiers)',
  'natural/eco home products', 'specialized hobby gear (low-saturation, passionate buyers)', 'adaptive / accessibility products',
  'personalized pet accessories', 'personalized jewelry / projection necklaces', 'travel-convenience gadgets',
];
export const SATURATED_CATEGORIES = [
  'generic phone cases / screen protectors / cables', 'basic fitness gear (resistance bands, yoga mats, foam rollers)',
  'posture correctors', 'generic LED strip lights', 'fast-fashion basics & general apparel', 'watches',
  'generic pet accessories', 'stationery/pens', 'cheap generic electronics', 'any sub-$10 item without a bundle/backend',
];

export function compileRubricForPrompt(): string {
  const lines = FACTORS.map(
    (f, i) =>
      `${i + 1}. [${f.id}] ${f.label} (weight ${f.weight}%${f.gate ? ', GATE' : ''})\n   1 = ${f.low}\n   10 = ${f.high}`
  );
  return lines.join('\n');
}
