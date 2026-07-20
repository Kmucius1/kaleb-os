import { supabase } from '@/lib/supabase'
import { supabaseDryp } from '@/lib/supabaseDryp'
import { sendPushToAll, claimOnce } from '@/lib/push'
import { getTodaySchedule, fmtClock } from '@/lib/schedule'

// Emoji per pillar for schedule notifications.
const PILLAR_EMOJI: Record<string, string> = {
  Spirit: '🧘', Mind: '🧠', Body: '💪', Money: '💰', Mission: '🚀', Relationships: '🤝',
}
// Only fire a block/event within this many minutes of its start (one tick after
// it begins) so a mid-day deploy doesn't replay the whole morning.
const BLOCK_WINDOW = 16

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// How long after a scheduled time we'll still fire it (tolerates an
// infrequent cron). Dedup via notification_log keeps it to once/day.
const WINDOW_MIN = 120

// Minutes-since-midnight in America/New_York right now.
function etNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? '0') % 24
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? '0')
  return h * 60 + m
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    const url = new URL(request.url)
    if (auth !== `Bearer ${secret}` && url.searchParams.get('key') !== secret) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const nowMin = etNowMinutes()
  const log: Record<string, unknown> = { sent: 0 }
  let sent = 0

  // 1) Recurring scheduled notifications (meditation + journal/feeling).
  const { data: schedule } = await supabase
    .from('notification_schedule').select('*').eq('active', true)
  for (const row of schedule ?? []) {
    const [hh, mm] = String(row.time_et).split(':').map(Number)
    const schedMin = (hh || 0) * 60 + (mm || 0)
    const due = nowMin >= schedMin && nowMin < schedMin + WINDOW_MIN
    if (!due) continue
    if (!(await claimOnce('schedule', row.id, row.title, row.body))) continue
    const r = await sendPushToAll({ title: row.title, body: row.body || '', url: row.deep_link || '/', tag: `sched-${row.kind}` })
    sent += r.sent
  }

  // 1b) The schedule itself — fire a push as each block (and dated event) begins.
  try {
    const s = await getTodaySchedule()
    for (const b of s.blocks) {
      if (!b.notify) continue
      if (!(nowMin >= b.start_min && nowMin < b.start_min + BLOCK_WINDOW)) continue
      if (!(await claimOnce('block', b.id, b.title))) continue
      const emoji = PILLAR_EMOJI[b.pillar] ?? '⏱️'
      // Spoken-style headline ("Time to wake up"); context in the body.
      const title = `${emoji} ${b.cue || b.title}`
      const body = [b.theme ? `Today: ${b.theme}.` : '', b.detail || ''].filter(Boolean).join(' ')
      const r = await sendPushToAll({ title, body, url: '/schedule', tag: 'schedule' })
      sent += r.sent
    }
    for (const e of s.events) {
      if (!e.notify || e.start_min == null) continue
      if (!(nowMin >= e.start_min && nowMin < e.start_min + BLOCK_WINDOW)) continue
      if (!(await claimOnce('event', e.id, e.title))) continue
      const r = await sendPushToAll({ title: `📌 ${fmtClock(e.start_min)} · ${e.title}`, body: e.note || e.location || '', url: '/schedule', tag: 'event' })
      sent += r.sent
    }
  } catch (err) { log.schedule_error = (err as Error).message }

  // 2) One-off reminders that have come due.
  const nowIso = new Date().toISOString()
  const { data: due } = await supabase
    .from('reminders').select('id,message,due_at').eq('sent', false).lte('due_at', nowIso)
  for (const rem of due ?? []) {
    const r = await sendPushToAll({ title: '⏰ Reminder', body: rem.message, url: '/', tag: `rem-${rem.id}` })
    sent += r.sent
    await supabase.from('reminders').update({ sent: true }).eq('id', rem.id)
  }

  // 3) New DRYP leads (created in the last 2h, still not started).
  try {
    const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    const { data: leads } = await supabaseDryp
      .from('leads').select('id,business_name,stage,created_at')
      .eq('stage', 'not_started').gte('created_at', since)
    for (const l of leads ?? []) {
      if (!(await claimOnce('lead', l.id, l.business_name))) continue
      const r = await sendPushToAll({ title: '🆕 New DRYP lead', body: (l.business_name || 'New lead') + ' — respond fast.', url: '/business', tag: 'lead' })
      sent += r.sent
    }
  } catch (e) { log.lead_error = (e as Error).message }

  // 4) New approvals waiting (created in the last 2h).
  try {
    const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    const { data: acts } = await supabase
      .from('agent_actions').select('id,description,created_at')
      .eq('status', 'pending_approval').gte('created_at', since)
    for (const a of acts ?? []) {
      if (!(await claimOnce('approval', a.id, a.description))) continue
      const r = await sendPushToAll({ title: '✅ Approval needed', body: (a.description || 'Atlas needs your OK').slice(0, 120), url: '/approvals', tag: 'approval' })
      sent += r.sent
    }
  } catch (e) { log.approval_error = (e as Error).message }

  log.sent = sent
  log.etMinutes = nowMin
  return Response.json({ ok: true, ...log })
}
