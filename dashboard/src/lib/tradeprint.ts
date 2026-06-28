// TradePrint trading-journal data for Kaleb OS / Atlas.
import { tradePrintClient } from "./supabaseTradePrint";

export async function getTradingSnapshot() {
  const tp = tradePrintClient();
  const [{ data: j }, { data: p }] = await Promise.all([
    tp.from("journal_entries")
      .select("date,market_bias,mental_readiness,what_went_well,what_to_improve,emotional_reflection,rule_violations_noted,consecutive_days,ai_summary")
      .order("date", { ascending: false }).limit(1),
    tp.from("psychology_checkins")
      .select("date,sleep_quality,stress_level,focus_level,readiness,readiness_score,ai_recommendation")
      .order("date", { ascending: false }).limit(1),
  ]);
  return {
    latest_journal: j?.[0] ?? null,
    latest_psychology: p?.[0] ?? null,
    journal_streak_days: j?.[0]?.consecutive_days ?? 0,
  };
}
