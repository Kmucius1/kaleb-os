// Project the code-owned rhythm template into `schedule_blocks`.
//
// The template in src/lib/rhythm/template.ts is the source of truth. This
// script renders it into the DB table that the notification cron and the older
// screens still read, so both stay in lockstep.
//
// Safe by construction: the existing rows are copied into
// kalebos_config['schedule_blocks_backup_<stamp>'] before anything is deleted.
//
//   node scripts/seed-rhythm.mjs           # dry run, prints the plan
//   node scripts/seed-rhythm.mjs --apply   # writes

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
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

// Import the real TypeScript template — never a copy of it, so the DB can't
// drift from the source of truth. esbuild (already present via vitest) bundles
// it to a temp ESM module we can import.
const { execFileSync } = await import("node:child_process");
const { mkdtempSync, writeFileSync: writeTmp } = await import("node:fs");
const { tmpdir } = await import("node:os");

const tmp = join(mkdtempSync(join(tmpdir(), "kos-seed-")), "template.mjs");
execFileSync(
  join(here, "..", "node_modules", ".bin", "esbuild"),
  [join(here, "..", "src", "lib", "rhythm", "template.ts"), "--bundle", "--format=esm", "--platform=node", `--outfile=${tmp}`],
  { stdio: "pipe" }
);
const { TEMPLATES } = await import(tmp);

function rows() {
  const out = [];
  for (const [dayType, blocks] of Object.entries(TEMPLATES)) {
    blocks.forEach((b, i) => {
      out.push({
        day_type: dayType,
        sort_order: i + 1,
        start_min: b.start,
        end_min: b.end,
        title: b.title,
        pillar: b.pillar,
        identity: b.identity ?? null,
        detail: b.detail ?? null,
        rotates: b.rotates ?? null,
        // The Horizon Walk moves with the sun; its reminder is fired by the
        // rhythm engine in the tick cron, not by this fixed row.
        notify: b.key === "horizon" ? false : b.notify !== false,
        cue: b.cue ?? null,
      });
    });
  }
  return out;
}

const next = rows();
console.log(`Rendering ${next.length} blocks:`);
for (const [dayType, blocks] of Object.entries(TEMPLATES)) {
  console.log(`  ${dayType}: ${blocks.length} blocks, ${fmt(blocks[0].start)} → ${fmt(blocks[blocks.length - 1].start)}`);
}

function fmt(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ap = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ap}`;
}

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

const existing = await rest("schedule_blocks?select=*");
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "");
await rest("kalebos_config", {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify({ key: `schedule_blocks_backup_${stamp}`, value: JSON.stringify(existing) }),
});
console.log(`Backed up ${existing.length} old blocks → kalebos_config.schedule_blocks_backup_${stamp}`);

await rest("schedule_blocks?id=not.is.null", { method: "DELETE", headers: { Prefer: "return=minimal" } });
const inserted = await rest("schedule_blocks", { method: "POST", body: JSON.stringify(next) });
console.log(`✅ Seeded ${inserted.length} blocks (was ${existing.length}).`);
