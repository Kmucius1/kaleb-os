import { supabase } from './supabase'
import { supabaseDryp } from './supabaseDryp'
import { chatJSON } from './llm'
import { getTodaySchedule, fmtClock } from './schedule'
import { getRevenueSnapshot } from './ledger'

export const etToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
const etDateLong = () => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' }).format(new Date())

const WMO: Record<number, string> = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
}

export type Weather = { city: string; tempNow: number; hi: number; lo: number; desc: string; sunrise: string; sunset: string } | null

export async function getWeather(): Promise<Weather> {
  try {
    const { data } = await supabase.from('kalebos_config').select('value').eq('key', 'location').maybeSingle()
    const loc = JSON.parse(data?.value || '{}')
    const lat = loc.lat ?? 26.12, lon = loc.lon ?? -80.14, city = loc.city ?? 'Florida'
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=1`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) return null
    const w = await res.json()
    const hhmm = (iso: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date(iso))
    return {
      city,
      tempNow: Math.round(w.current?.temperature_2m ?? 0),
      hi: Math.round(w.daily?.temperature_2m_max?.[0] ?? 0),
      lo: Math.round(w.daily?.temperature_2m_min?.[0] ?? 0),
      desc: WMO[w.current?.weather_code] ?? 'Clear',
      sunrise: w.daily?.sunrise?.[0] ? hhmm(w.daily.sunrise[0]) : '',
      sunset: w.daily?.sunset?.[0] ? hhmm(w.daily.sunset[0]) : '',
    }
  } catch { return null }
}

async function gatherMorning() {
  const [schedule, weather, tasksRes, cfgRes, ideasRes, rev, dryp] = await Promise.all([
    getTodaySchedule(),
    getWeather(),
    supabase.from('tasks').select('title,priority').in('status', ['pending', 'in_progress']).order('priority', { ascending: false }).limit(8),
    supabase.from('kalebos_config').select('key,value').in('key', ['north_star', 'persona']),
    supabase.from('content_ideas').select('id', { count: 'exact', head: true }).in('status', ['idea', 'approved']),
    getRevenueSnapshot().catch(() => null),
    (async () => {
      try {
        const [{ data: accts }, { data: leads }] = await Promise.all([
          supabaseDryp.from('accounts').select('business_name,is_active'),
          supabaseDryp.from('leads').select('business_name,stage'),
        ])
        return {
          clients: (accts ?? []).filter((a: any) => a.is_active).length,
          newLeads: (leads ?? []).filter((l: any) => l.stage === 'not_started').map((l: any) => (l.business_name || '').trim()),
        }
      } catch { return { clients: 0, newLeads: [] as string[] } }
    })(),
  ])
  const cfg = Object.fromEntries((cfgRes.data ?? []).map((r: any) => [r.key, r.value]))
  return {
    date: etDateLong(),
    dayType: schedule.dayType,
    keyBlocks: schedule.blocks.filter(b => b.notify).slice(0, 8).map(b => `${fmtClock(b.start_min)} ${b.title}${b.theme ? ' — ' + b.theme : ''} [${b.pillar}]`),
    tasks: (tasksRes.data ?? []).map((t: any) => t.title),
    contentIdeasReady: ideasRes.count ?? 0,
    clients: dryp.clients,
    newLeads: dryp.newLeads,
    cashThisMonth: rev?.thisMonth ?? null,
    northStar: cfg.north_star || 'Become the man capable of creating everything else.',
    weather,
  }
}

export async function generateMorningBrief() {
  const ctx = await gatherMorning()
  const w = ctx.weather
  const sys = 'You are Atlas, the intelligence of KalebOS — a calm, grounded strategist. Generate Kaleb\'s morning briefing. Optimize for alignment, not busywork. Be concise and specific. Return ONLY JSON.'
  const user =
    `Date: ${ctx.date} (${ctx.dayType}).\n` +
    `North star: ${ctx.northStar}\n` +
    (w ? `Weather (${w.city}): ${w.desc}, ${w.tempNow}°F (${w.lo}–${w.hi}). Sunrise ${w.sunrise}, sunset ${w.sunset}.\n` : '') +
    `Today's schedule: ${ctx.keyBlocks.join(' | ')}\n` +
    `Open tasks: ${ctx.tasks.join('; ') || 'none'}\n` +
    `DRYP: ${ctx.clients} active clients; new leads: ${ctx.newLeads.join(', ') || 'none'}.\n` +
    `Content ideas ready: ${ctx.contentIdeasReady}. Cash in this month: ${ctx.cashThisMonth != null ? '$' + Math.round(ctx.cashThisMonth) : 'n/a'}.\n\n` +
    `Return JSON: {"headline": "one warm grounded line to open the day", "identity_line": "a short identity-reinforcing sentence", "focus": "the single most important focus today (short)", "top3": ["priority 1","priority 2","priority 3"], "body": "a concise markdown brief with sections: Focus, Today, Business, and one closing thought. Keep under 180 words."}`

  const out = await chatJSON<any>(sys, user, { temperature: 0.6 })
  const row = {
    review_date: etToday(), type: 'morning',
    headline: out.headline ?? null, identity_line: out.identity_line ?? null,
    focus: out.focus ?? ctx.northStar, top3: Array.isArray(out.top3) ? out.top3.slice(0, 3) : null,
    body: out.body ?? null, data: ctx as any,
  }
  await supabase.from('daily_reviews').upsert(row, { onConflict: 'review_date,type' })
  return row
}

async function gatherEvening() {
  const today = etToday()
  const startIso = new Date(Date.now() - 20 * 3600 * 1000).toISOString()
  const [journalRes, tradesRes, tasksDoneRes, moodRes, briefRes] = await Promise.all([
    supabase.from('journal').select('content,kind').eq('entry_date', today),
    supabase.from('trades').select('pnl,outcome,symbol').gte('created_at', startIso).then(r => r, () => ({ data: [] as any[] })),
    supabase.from('tasks').select('title').eq('status', 'completed').gte('updated_at', startIso).then(r => r, () => ({ data: [] as any[] })),
    supabase.from('mood_checkins').select('mood,score').gte('created_at', startIso).then(r => r, () => ({ data: [] as any[] })),
    supabase.from('daily_reviews').select('top3').eq('review_date', today).eq('type', 'morning').maybeSingle(),
  ])
  const trades = tradesRes.data ?? []
  return {
    date: etDateLong(),
    journal: (journalRes.data ?? []).map((j: any) => `[${j.kind}] ${j.content}`),
    tradesCount: trades.length,
    pnl: trades.reduce((s: number, t: any) => s + (Number(t.pnl) || 0), 0),
    tasksDone: (tasksDoneRes.data ?? []).map((t: any) => t.title),
    mood: (moodRes.data ?? []).map((m: any) => `${m.mood}${m.score ? ' (' + m.score + '/5)' : ''}`),
    morningTop3: (briefRes.data?.top3 as string[]) ?? [],
  }
}

export async function generateEveningReview() {
  const ctx = await gatherEvening()
  const sys = 'You are Atlas, the intelligence of KalebOS. Generate Kaleb\'s evening review. Synthesize patterns — do not just list events. Be honest, calm, and constructive. Return ONLY JSON.'
  const user =
    `Date: ${ctx.date}.\n` +
    `This morning's Top 3: ${ctx.morningTop3.join('; ') || 'n/a'}\n` +
    `Journal entries today: ${ctx.journal.join(' || ') || 'none'}\n` +
    `Trades: ${ctx.tradesCount}, net P&L $${Math.round(ctx.pnl)}. Mood: ${ctx.mood.join(', ') || 'not logged'}.\n` +
    `Tasks completed: ${ctx.tasksDone.join('; ') || 'none logged'}.\n\n` +
    `Return JSON: {"score": <integer 1-10 for how aligned/strong the day was>, "headline": "one honest line summarizing the day", "body": "a concise markdown review with sections: Wins, What slipped, Pattern (one insight connecting today to a theme), Tomorrow's focus. Under 180 words."}`

  const out = await chatJSON<any>(sys, user, { temperature: 0.6 })
  const row = {
    review_date: etToday(), type: 'evening',
    headline: out.headline ?? null, score: Number.isFinite(out.score) ? Math.round(out.score) : null,
    body: out.body ?? null, data: ctx as any,
  }
  await supabase.from('daily_reviews').upsert(row, { onConflict: 'review_date,type' })
  return row
}

export async function getTodayReviews() {
  const { data } = await supabase.from('daily_reviews').select('*').eq('review_date', etToday())
  const morning = (data ?? []).find((r: any) => r.type === 'morning') ?? null
  const evening = (data ?? []).find((r: any) => r.type === 'evening') ?? null
  return { morning, evening }
}
