// Add the daily metrics the rhythm asks for that aren't habits yet:
// sleep duration, body weight, hydration.
//
// Additive only — it never touches or removes an existing habit, and skips any
// name that already exists.
//
//   node scripts/seed-metrics.mjs           # dry run
//   node scripts/seed-metrics.mjs --apply

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env.local"), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_BASE || !KEY) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY missing from .env.local");
const APPLY = process.argv.includes("--apply");

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// `measure` is a reading, not a tally: the target is a goal, and HabitRow gives
// it direct entry instead of a plus button.
const WANTED = [
  { name: "Sleep", icon: "sleep", kind: "duration", target: 8, unit: "h", step: 0.5, pillar: "Body", sort_order: 20 },
  { name: "Body Weight", icon: "weight", kind: "measure", target: 185, unit: " lb", step: 0.2, pillar: "Body", sort_order: 21 },
  { name: "Hydration", icon: "water", kind: "count", target: 100, unit: " oz", step: 16, pillar: "Body", sort_order: 22 },
];

const existing = await rest("habits?select=name");
const have = new Set((existing ?? []).map((h) => String(h.name).toLowerCase()));
const missing = WANTED.filter((w) => !have.has(w.name.toLowerCase()));

console.log(`${existing.length} habits already exist.`);
if (missing.length === 0) {
  console.log("Nothing to add — all three metrics are already tracked.");
  process.exit(0);
}
console.log("Would add:");
for (const m of missing) console.log(`  ${m.name} (${m.kind}, target ${m.target}${m.unit})`);

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

const inserted = await rest("habits", {
  method: "POST",
  body: JSON.stringify(missing.map((m) => ({ ...m, active: true }))),
});
console.log(`✅ Added ${inserted.length} habits.`);
