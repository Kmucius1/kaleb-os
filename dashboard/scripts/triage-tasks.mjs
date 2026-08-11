#!/usr/bin/env node
// Triage every untriaged task.
//
// The list reached 306 open rows, all status='pending', all priority 6 (the DB
// default — nothing had ever set one), because PLAUD ingest files an action item
// for every action-ish sentence in a transcript. This scores each one on the two
// axes that matter: whose is it, and does it matter.
//
//   node scripts/triage-tasks.mjs            # dry run, prints the verdicts
//   node scripts/triage-tasks.mjs --write    # writes owner/priority/area
//   node scripts/triage-tasks.mjs --write --all   # re-triage everything, not just untriaged
//
// Nothing is deleted. "Not mine" tasks keep their row and show under the
// Not mine tab — they just stop competing with his own work.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(join(here, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const SUPABASE_URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SECRET_KEY
const OR_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
const WRITE = process.argv.includes('--write')
const ALL = process.argv.includes('--all')
const BATCH = 25

if (!SUPABASE_URL || !KEY) { console.error('SUPABASE_URL / SUPABASE_SECRET_KEY missing'); process.exit(1) }
if (!OR_KEY) { console.error('OPENROUTER_API_KEY missing'); process.exit(1) }

const { TRIAGE_RUBRIC, TRIAGE_FORMAT, TASK_AREAS: AREAS } = await import('../src/lib/taskRubric.mjs')
const RUBRIC = `${TRIAGE_RUBRIC}\n\n${TRIAGE_FORMAT}`

const sb = (path, init = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...init,
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
})

const ageDays = (iso) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86400000))

function dedupeKey(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|to|for|with|about|on|of|and|re|please|need|needs|should|must)\b/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 120)
}

async function triage(batch) {
  const payload = batch.map(t => ({
    id: t.id, title: t.title, age_days: ageDays(t.created_at),
    ...(t.description ? { description: t.description.slice(0, 300) } : {}),
  }))
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OR_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Kaleb OS Task Triage' },
    body: JSON.stringify({
      model: MODEL, temperature: 0, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: RUBRIC }, { role: 'user', content: JSON.stringify(payload) }],
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const raw = (await res.json())?.choices?.[0]?.message?.content ?? '{}'
  let parsed = {}
  try { parsed = JSON.parse(raw) } catch { throw new Error(`unparseable: ${raw.slice(0, 200)}`) }

  const valid = new Set(batch.map(t => t.id))
  const out = {}
  for (const r of parsed.tasks ?? []) {
    if (!valid.has(r?.id)) continue
    out[r.id] = {
      owner: r.owner === 'team' || r.owner === 'other' ? r.owner : 'kaleb',
      priority: Math.min(10, Math.max(1, Math.round(Number(r.priority) || 5))),
      area: AREAS.includes(r.area) ? r.area : 'other',
    }
  }
  return out
}

const filter = ALL ? '' : '&triaged_at=is.null'
const rows = await sb(`tasks?select=id,title,description,priority,status,created_at&status=in.(pending,in_progress)${filter}&order=created_at.desc`).then(r => r.json())
if (!Array.isArray(rows)) { console.error('fetch failed:', rows); process.exit(1) }
console.log(`${rows.length} task(s) to triage${WRITE ? '' : '  (dry run — pass --write to save)'}\n`)

// Same title filed twice by two chunks of one recording. Keep the first, mark
// the rest dismissed rather than scoring the same work over and over.
const seen = new Map()
const dupes = []
const work = []
for (const t of rows) {
  const k = dedupeKey(t.title)
  if (seen.has(k)) { dupes.push({ ...t, dupe_of: seen.get(k) }); continue }
  seen.set(k, t.id)
  work.push(t)
}
if (dupes.length) console.log(`${dupes.length} duplicate title(s) → dismissed\n`)

const verdicts = {}
for (let i = 0; i < work.length; i += BATCH) {
  const batch = work.slice(i, i + BATCH)
  process.stdout.write(`  triaging ${i + 1}-${i + batch.length} of ${work.length} ... `)
  try {
    const got = await triage(batch)
    Object.assign(verdicts, got)
    console.log(`${Object.keys(got).length} scored`)
  } catch (e) {
    console.log(`FAILED (${e.message}) — left untriaged`)
  }
}

const tally = { kaleb: 0, team: 0, other: 0 }
const buckets = { now: 0, soon: 0, someday: 0 }
for (const t of work) {
  const v = verdicts[t.id]
  if (!v) continue
  tally[v.owner]++
  if (v.owner === 'kaleb') buckets[v.priority >= 8 ? 'now' : v.priority >= 5 ? 'soon' : 'someday']++
}

console.log('\n── verdict ──────────────────────────────')
console.log(`  kaleb ${tally.kaleb}   team ${tally.team}   other ${tally.other}   (+${dupes.length} dupes)`)
console.log(`  his:  Now ${buckets.now}   Soon ${buckets.soon}   Someday ${buckets.someday}`)

console.log('\n── his Now bucket ───────────────────────')
for (const t of work.filter(t => verdicts[t.id]?.owner === 'kaleb' && verdicts[t.id].priority >= 8)
  .sort((a, b) => verdicts[b.id].priority - verdicts[a.id].priority)) {
  console.log(`  P${verdicts[t.id].priority} [${verdicts[t.id].area}] ${t.title.slice(0, 90)}`)
}

if (!WRITE) { console.log('\nDry run. Re-run with --write to save.'); process.exit(0) }

let wrote = 0
const failed = []
const unscored = work.filter(t => !verdicts[t.id])
for (const t of work) {
  const v = verdicts[t.id]
  if (!v) continue
  const res = await sb(`tasks?id=eq.${t.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...v, dedupe_key: dedupeKey(t.title), triaged_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  })
  if (res.ok) wrote++
  else failed.push(`${t.id} P${v.priority}: ${(await res.text()).slice(0, 200)}`)
}
for (const d of dupes) {
  await sb(`tasks?id=eq.${d.id}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'dismissed', dismissed_at: new Date().toISOString(), triaged_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  })
}
// A partial write is the dangerous outcome: the rows that fail are not random,
// they're the ones the model scored highest, and a summary that only counts
// successes reads as "done" while the Now bucket sits empty.
console.log(`\n${failed.length || unscored.length ? '⚠️ ' : '✅'} wrote ${wrote} verdict(s), dismissed ${dupes.length} duplicate(s).`)
if (unscored.length) console.log(`   ${unscored.length} task(s) the model never scored — re-run to pick them up.`)
if (failed.length) {
  console.log(`   ${failed.length} write(s) REJECTED by the database:`)
  for (const f of failed.slice(0, 5)) console.log(`     ${f}`)
  process.exitCode = 1
}
