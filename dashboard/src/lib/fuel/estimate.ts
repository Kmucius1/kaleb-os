// Turning a photo of a plate into numbers — and being honest about what that
// is worth.
//
// THE RULE, restated because it is the whole design:
//   A photo produces an ESTIMATE, never a measurement.
//
// Everything here is built to keep that true:
//   * every item carries its own confidence, and the meal carries the weakest
//     of them rather than an average that would flatter the guess
//   * totals are always rendered with "≈" and never rounded to a false
//     precision (no 618 kcal — it is 620)
//   * nothing counts toward the day until a human has confirmed it
//
// Pure module: no database, no network. The route does the I/O.

export type FuelItem = {
  name: string;
  qty: number | null;
  unit: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  produce_servings: number;
  /** 0..1 — how sure the model is about THIS food and THIS portion. */
  confidence: number;
};

export type FuelEstimate = {
  items: FuelItem[];
  /** Weakest link, not the average. */
  confidence: number;
  note: string | null;
};

export type Totals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  produce_servings: number;
};

export const MACROS = ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "produce_servings"] as const;

export const VISION_SYSTEM = `You estimate the nutritional content of a meal from a photograph.

You are producing an ESTIMATE, not a measurement. Portions from a photo are
genuinely uncertain, and pretending otherwise is worse than useless — the
person reading this will act on it.

Rules:
- Identify each distinct food you can actually see. Do not invent sides,
  sauces, or drinks that are not visible.
- Estimate the portion using visible references (plate diameter, cutlery, hand,
  can or bottle size). Say what you used in "note".
- confidence is per item, 0 to 1. Be honest and be willing to be low:
    0.8+  clearly identifiable food AND a clear size reference
    0.5-0.8 confident about the food, unsure about the portion
    below 0.5 obscured, mixed, or you are guessing at the composition
- A dish whose insides you cannot see (a burrito, a stew, a covered bowl) is
  low confidence. Say so rather than guessing precisely.
- produce_servings counts fruit and vegetable servings only (roughly 80g each).
  Potatoes as a starch do not count. Sauces do not count.
- Round to sensible precision: whole calories, one decimal on grams at most.
- Group sensibly and return AT MOST 12 items. "Mixed salad" is one item, not
  nine vegetables. A long list of tiny components is less useful than a short
  list of real portions, and risks the answer being cut off.

Return ONLY JSON, no prose, no code fences:
{
  "items": [
    { "name": "grilled chicken breast", "qty": 6, "unit": "oz",
      "calories": 280, "protein_g": 52, "carbs_g": 0, "fat_g": 6,
      "fiber_g": 0, "produce_servings": 0, "confidence": 0.8 }
  ],
  "note": "portion judged against a 10-inch plate",
  "overall_confidence": 0.7
}`;

export const VISION_PROMPT =
  "Estimate what is on this plate. Identify each food, estimate its portion, and give per-item macros with an honest confidence for each.";

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Strip code fences a model adds despite being told not to. */
export function stripFences(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
}

/**
 * Parse a model response into an estimate.
 *
 * Throws only when there is nothing usable at all — a partially malformed item
 * is dropped rather than taking the whole meal down, because losing one
 * identified food is much better than losing the photo.
 */
export function looksTruncated(raw: string): boolean {
  const t = stripFences(raw);
  if (!t.startsWith("{")) return false;
  // Balanced braces mean it finished; a shortfall means the answer was cut off
  // rather than malformed, which is a different problem with a different fix.
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (const ch of t) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") depth--;
  }
  return depth > 0;
}

export function parseEstimate(raw: string): FuelEstimate {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    // Saying "not usable JSON" when the real problem is a cut-off answer sends
    // you looking in the wrong place. It happened; hence this branch.
    if (looksTruncated(raw)) {
      throw new Error(
        "The model's answer was cut off before it finished. Try a photo of just your plate rather than a whole spread.",
      );
    }
    throw new Error("The model did not return usable JSON.");
  }
  const obj = parsed as Record<string, unknown>;
  const rawItems = Array.isArray(obj?.items) ? obj.items : [];

  const items: FuelItem[] = [];
  for (const r of rawItems as Record<string, unknown>[]) {
    const name = typeof r?.name === "string" ? r.name.trim() : "";
    if (!name) continue; // a food with no name is not a food
    items.push({
      name,
      qty: r?.qty === null || r?.qty === undefined ? null : num(r.qty, 0),
      unit: typeof r?.unit === "string" && r.unit.trim() ? r.unit.trim() : null,
      calories: Math.max(0, num(r?.calories)),
      protein_g: Math.max(0, num(r?.protein_g)),
      carbs_g: Math.max(0, num(r?.carbs_g)),
      fat_g: Math.max(0, num(r?.fat_g)),
      fiber_g: Math.max(0, num(r?.fiber_g)),
      produce_servings: Math.max(0, num(r?.produce_servings)),
      // An item that forgot to rate itself is not thereby certain.
      confidence: clamp01(num(r?.confidence, 0.4)),
    });
  }

  if (items.length === 0) throw new Error("No food was identified in that photo.");

  return {
    items,
    confidence: mealConfidence(items, obj?.overall_confidence),
    note: typeof obj?.note === "string" && obj.note.trim() ? obj.note.trim() : null,
  };
}

/**
 * The meal is only as trustworthy as its least trustworthy component.
 *
 * Averaging would let four confident sides bury one unidentifiable centrepiece,
 * which is exactly the case where a human most needs to look.
 */
export function mealConfidence(items: FuelItem[], stated?: unknown): number {
  if (items.length === 0) return 0;
  const weakest = Math.min(...items.map(i => i.confidence));
  const said = stated === undefined ? null : clamp01(num(stated, 0));
  // Trust the model's own overall score only when it is not more optimistic
  // than its own weakest item.
  return said === null ? weakest : Math.min(weakest, said);
}

export function sumItems(items: Pick<FuelItem, (typeof MACROS)[number]>[]): Totals {
  const t: Totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, produce_servings: 0 };
  for (const i of items) for (const m of MACROS) t[m] += Math.max(0, num(i[m]));
  // Calories to the nearest 10, grams to one decimal: a photo cannot support
  // "618 kcal", and printing it would be a lie of precision.
  return {
    calories: Math.round(t.calories / 10) * 10,
    protein_g: Math.round(t.protein_g * 10) / 10,
    carbs_g: Math.round(t.carbs_g * 10) / 10,
    fat_g: Math.round(t.fat_g * 10) / 10,
    fiber_g: Math.round(t.fiber_g * 10) / 10,
    produce_servings: Math.round(t.produce_servings * 10) / 10,
  };
}

export type ConfidenceBand = "high" | "medium" | "low";

export function bandFor(confidence: number): ConfidenceBand {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/**
 * What the UI says about a confidence, in words.
 *
 * Deliberately not a ± range: inventing "620 ± 190 kcal" from a 0.4 confidence
 * would manufacture a second number the photo cannot support. Naming the
 * uncertainty and asking him to check the portion is honest; a fabricated
 * error bar is not.
 */
export const BAND_LABEL: Record<ConfidenceBand, string> = {
  high: "Clear",
  medium: "Check the portion",
  low: "Rough guess — please correct",
};
